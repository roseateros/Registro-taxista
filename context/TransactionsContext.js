import { createContext, useState, useContext, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';

const TransactionsContext = createContext();

export const TransactionTypes = {
    INCOME: 'income',
    EXPENSE: 'expense'
};

export const useTransactions = () => useContext(TransactionsContext);

export const TransactionsProvider = ({ children }) => {
    const [transactions, setTransactions] = useState([]);
    const [isPickerActive, setIsPickerActive] = useState(false);
    const timeoutRef = useRef(null);

    useEffect(() => {
        loadTransactions();
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const loadTransactions = async () => {
        try {
            const savedTransactions = await AsyncStorage.getItem('transactions');
            if (savedTransactions) {
                setTransactions(JSON.parse(savedTransactions));
            }
        } catch (error) {
            console.error('Error loading transactions:', error);
            throw new Error('Failed to load transactions');
        }
    };

    const saveTransactions = async (newTransactions) => {
        try {
            await AsyncStorage.setItem('transactions', JSON.stringify(newTransactions));
            setTransactions(newTransactions);
        } catch (error) {
            console.error('Error saving transactions:', error);
            throw new Error('Failed to save transactions');
        }
    };

    const exportTransactions = async () => {
        try {
            if (transactions.length === 0) {
                throw new Error('No transactions to export');
            }

            const directory = Platform.OS === 'ios'
                ? FileSystem.cacheDirectory
                : FileSystem.documentDirectory;

            const fileUri = `${directory}transactions.json`;
            await FileSystem.writeAsStringAsync(
                fileUri,
                JSON.stringify(transactions, null, 2),
                { encoding: FileSystem.EncodingType.UTF8 }
            );

            const canShare = await Sharing.isAvailableAsync();
            if (!canShare) {
                throw new Error('Sharing is not available on this device');
            }

            await Sharing.shareAsync(fileUri, {
                mimeType: 'application/json',
                UTI: 'public.json',
                dialogTitle: 'Export Transactions'
            });
        } catch (error) {
            console.error('Error exporting transactions:', error);
            throw error;
        }
    };

    const importTransactions = async () => {
        // Prevent multiple picker instances
        if (isPickerActive) {
            console.log('Document picking already in progress');
            return;
        }

        try {
            setIsPickerActive(true);

            // Clear any existing timeouts
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/json',
                copyToCacheDirectory: true,
                multiple: false
            });

            // Handle cancellation or no selection
            if (result.canceled || !result.assets || result.assets.length === 0) {
                console.log('Document picking canceled');
                return;
            }

            const fileUri = result.assets[0].uri;
            console.log('Selected file URI:', fileUri);

            // Handle iOS file URI
            const validFileUri = Platform.OS === 'ios'
                ? decodeURIComponent(fileUri.replace('file://', ''))
                : fileUri;

            const fileContent = await FileSystem.readAsStringAsync(validFileUri, {
                encoding: FileSystem.EncodingType.UTF8
            });

            let importedTransactions;
            try {
                importedTransactions = JSON.parse(fileContent);
            } catch (e) {
                throw new Error('Invalid JSON format');
            }

            if (!Array.isArray(importedTransactions)) {
                throw new Error('Invalid file format. Expected an array of transactions.');
            }

            // Validate transactions
            const validatedTransactions = importedTransactions.map(transaction => {
                if (!transaction.amount || !transaction.type ||
                    !Object.values(TransactionTypes).includes(transaction.type)) {
                    throw new Error('Invalid transaction format');
                }
                return {
                    ...transaction,
                    id: transaction.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                };
            });

            // Merge transactions, avoiding duplicates
            const existingIds = new Set(transactions.map(t => t.id));
            const newTransactions = [
                ...transactions,
                ...validatedTransactions.filter(t => !existingIds.has(t.id))
            ];

            await saveTransactions(newTransactions);

            // Cleanup iOS temporary file
            if (Platform.OS === 'ios') {
                try {
                    await FileSystem.deleteAsync(validFileUri, { idempotent: true });
                } catch (cleanupError) {
                    console.warn('Clean up error:', cleanupError);
                }
            }

            console.log('Successfully imported', validatedTransactions.length, 'transactions');

        } catch (error) {
            console.error('Error importing transactions:', error);
            throw error instanceof Error ? error : new Error('Import failed');
        } finally {
            // Reset picker state with a delay
            timeoutRef.current = setTimeout(() => {
                setIsPickerActive(false);
            }, Platform.OS === 'ios' ? 1000 : 500);
        }
    };

    const addTransaction = async (transactionOrTransactions) => {
        try {
            const transactionsToAdd = Array.isArray(transactionOrTransactions)
                ? transactionOrTransactions
                : [transactionOrTransactions];

            const newTransactionsWithIds = transactionsToAdd.map(transaction => ({
                ...transaction,
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            }));

            const newTransactions = [...transactions, ...newTransactionsWithIds];
            await saveTransactions(newTransactions);
        } catch (error) {
            console.error('Error adding transaction:', error);
            throw new Error('Failed to add transaction');
        }
    };

    const deleteTransaction = async (id) => {
        try {
            const newTransactions = transactions.filter(t => t.id !== id);
            await saveTransactions(newTransactions);
        } catch (error) {
            console.error('Error deleting transaction:', error);
            throw new Error('Failed to delete transaction');
        }
    };

    const getBalance = () => {
        return transactions.reduce((acc, curr) => {
            return curr.type === TransactionTypes.INCOME
                ? acc + curr.amount
                : acc - curr.amount;
        }, 0);
    };

    return (
        <TransactionsContext.Provider value={{
            transactions,
            addTransaction,
            deleteTransaction,
            getBalance,
            exportTransactions,
            importTransactions,
        }}>
            {children}
        </TransactionsContext.Provider>
    );
};

export default TransactionsProvider;
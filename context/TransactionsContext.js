// context/TransactionsContext.js
import { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TransactionsContext = createContext();

export const TransactionTypes = {
    INCOME: 'income',
    EXPENSE: 'expense'
};

export const useTransactions = () => useContext(TransactionsContext);

export const TransactionsProvider = ({ children }) => {
    const [transactions, setTransactions] = useState([]);

    useEffect(() => {
        loadTransactions();
    }, []);

    const loadTransactions = async () => {
        try {
            const savedTransactions = await AsyncStorage.getItem('transactions');
            if (savedTransactions) {
                setTransactions(JSON.parse(savedTransactions));
            }
        } catch (error) {
            console.error('Error loading transactions:', error);
        }
    };

    const saveTransactions = async (newTransactions) => {
        try {
            await AsyncStorage.setItem('transactions', JSON.stringify(newTransactions));
            setTransactions(newTransactions); // Update state with new transactions
        } catch (error) {
            console.error('Error saving transactions:', error);
        }
    };

    const addTransaction = async (transactionOrTransactions) => {
        // Handle both single transaction and array of transactions
        const transactionsToAdd = Array.isArray(transactionOrTransactions)
            ? transactionOrTransactions
            : [transactionOrTransactions];

        // Add IDs to all new transactions
        const newTransactionsWithIds = transactionsToAdd.map(transaction => ({
            ...transaction,
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` // More unique ID
        }));

        // Combine with existing transactions
        const newTransactions = [...transactions, ...newTransactionsWithIds];
        await saveTransactions(newTransactions);
    };

    const deleteTransaction = async (id) => {
        const newTransactions = transactions.filter(t => t.id !== id);
        await saveTransactions(newTransactions);
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
        }}>
            {children}
        </TransactionsContext.Provider>
    );
};
import React, { useState, useCallback, useMemo } from 'react';
import { 
  View, 
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Keyboard,
  TouchableWithoutFeedback,
  Dimensions,
  ScrollView,
} from 'react-native';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { format } from 'date-fns';
import { useTransactions, TransactionTypes } from '../context/TransactionsContext';
import Colors from '../constants/Colors';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type InputField = {
  description: string;
  amount: string;
};

const INCOME_SOURCES = ['Taximeter Card', 'Taximeter Cash', 'FreeNow App Cash', 'FreeNow App Card', 'FreeNow Via App','FreeNow via Taximeter', 'Tips and other'];

const getInitialFields = (type: TransactionTypes): InputField[] => {
  if (type === TransactionTypes.INCOME) {
    return INCOME_SOURCES.map(description => ({
      description,
      amount: '',
    }));
  }
  return [{ description: '', amount: '' }];
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function OptimizedAddTransaction() {
  const [type, setType] = useState<TransactionTypes>(TransactionTypes.INCOME);
  const [fields, setFields] = useState<InputField[]>(getInitialFields(TransactionTypes.INCOME));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const { addTransaction } = useTransactions();

  const handleDateChange = useCallback((date: Date) => {
    setShowDatePicker(false);
    setSelectedDate(date);
  }, []);

  const handleTypeChange = useCallback((newType: TransactionTypes) => {
    setType(newType);
    setFields(getInitialFields(newType));
  }, []);

  const updateField = useCallback((index: number, field: keyof InputField, value: string) => {
    setFields(prevFields => {
      const newFields = [...prevFields];
      newFields[index] = { ...newFields[index], [field]: value };
      return newFields;
    });
  }, []);

  const getTotalAmount = useMemo(() => {
    return fields.reduce((sum, field) => {
      const amount = parseFloat(field.amount) || 0;
      return sum + amount;
    }, 0);
  }, [fields]);

  const handleSubmit = useCallback(async () => {
    const filledFields = fields.filter(field => {
      if (type === TransactionTypes.EXPENSE) {
        return field.description.trim() !== '' && field.amount.trim() !== '';
      }
      return field.amount.trim() !== '';
    });

    if (filledFields.length === 0) {
      alert(
        type === TransactionTypes.EXPENSE 
          ? 'Please fill in both description and amount' 
          : 'Please enter at least one amount'
      );
      return;
    }

    const transactions = filledFields.map(field => ({
      description: field.description,
      amount: parseFloat(field.amount),
      type,
      date: selectedDate.toISOString(),
    }));

    await addTransaction(transactions);
    setFields(getInitialFields(type));
    router.back();
  }, [fields, type, selectedDate, addTransaction]);

  const renderField = useCallback(({ item, index }: { item: InputField; index: number }) => {
    if (type === TransactionTypes.INCOME) {
      return (
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{item.description}</Text>
          <View style={styles.amountContainer}>
            <Text style={styles.currencySymbol}>€</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              value={item.amount}
              onChangeText={(value) => updateField(index, 'amount', value)}
              keyboardType="numeric"
              placeholderTextColor={Colors.placeholder}
            />
          </View>
        </View>
      );
    }

    return (
      <View style={styles.fullWidthFieldContainer}>
        <TextInput
          style={styles.descriptionInput}
          placeholder="Description"
          value={item.description}
          onChangeText={(value) => updateField(index, 'description', value)}
          placeholderTextColor={Colors.placeholder}
        />
        <View style={styles.amountContainer}>
          <Text style={styles.currencySymbol}>€</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0.00"
            value={item.amount}
            onChangeText={(value) => updateField(index, 'amount', value)}
            keyboardType="numeric"
            placeholderTextColor={Colors.placeholder}
          />
        </View>
      </View>
    );
  }, [type, updateField]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollViewContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.contentContainer}>
            <View style={styles.header}>
              <View style={styles.typeContainer}>
                <TouchableOpacity 
                  style={[
                    styles.typeButton, 
                    type === TransactionTypes.EXPENSE && styles.selectedExpenseType
                  ]}
                  onPress={() => handleTypeChange(TransactionTypes.EXPENSE)}
                >
                  <MaterialCommunityIcons 
                    name="arrow-up-circle" 
                    size={24} 
                    color={type === TransactionTypes.EXPENSE ? Colors.white : Colors.expense} 
                  />
                  <Text style={[
                    styles.typeText, 
                    type === TransactionTypes.EXPENSE && styles.selectedTypeText
                  ]}>
                    Expense
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.typeButton, 
                    type === TransactionTypes.INCOME && styles.selectedIncomeType
                  ]}
                  onPress={() => handleTypeChange(TransactionTypes.INCOME)}
                >
                  <MaterialCommunityIcons 
                    name="arrow-down-circle" 
                    size={24} 
                    color={type === TransactionTypes.INCOME ? Colors.white : Colors.income} 
                  />
                  <Text style={[
                    styles.typeText, 
                    type === TransactionTypes.INCOME && styles.selectedTypeText
                  ]}>
                    Income
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <MaterialCommunityIcons 
                  name="calendar" 
                  size={24} 
                  color={Colors.primary} 
                />
                <Text style={styles.dateButtonText}>
                  {format(selectedDate, 'MMM dd, yyyy')}
                </Text>
              </TouchableOpacity>
            </View>

            <FlatList
              key={type}
              data={fields}
              renderItem={renderField}
              keyExtractor={(item, index) => index.toString()}
              contentContainerStyle={styles.listContent}
              numColumns={type === TransactionTypes.INCOME ? 2 : 1}
              columnWrapperStyle={type === TransactionTypes.INCOME ? styles.row : undefined}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
            />

            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={[
                styles.totalAmount,
                { color: type === TransactionTypes.INCOME ? Colors.income : Colors.expense }
              ]}>
                €{getTotalAmount.toFixed(2)}
              </Text>
            </View>

            <TouchableOpacity 
              style={[
                styles.submitButton,
                { backgroundColor: type === TransactionTypes.INCOME ? Colors.income : Colors.expense }
              ]}
              onPress={handleSubmit}
            >
              <MaterialCommunityIcons 
                name="check-circle" 
                size={24} 
                color={Colors.white} 
              />
              <Text style={styles.submitButtonText}>
                Add {type === TransactionTypes.INCOME ? 'Income' : 'Expense'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <DateTimePickerModal
          isVisible={showDatePicker}
          mode="date"
          onConfirm={handleDateChange}
          onCancel={() => setShowDatePicker(false)}
          date={selectedDate}
        />
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: Colors.white,
    borderRadius: 8,
    gap: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  selectedExpenseType: {
    backgroundColor: Colors.expense,
  },
  selectedIncomeType: {
    backgroundColor: Colors.income,
  },
  typeText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  selectedTypeText: {
    color: Colors.white,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  dateButtonText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  listContent: {
    flexGrow: 1,
  },
  row: {
    justifyContent: 'space-between',
  },
  fieldContainer: {
    width: (SCREEN_WIDTH - 40) / 2,
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  descriptionInput: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 6,
    padding: 0,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    padding: 0,
  },
  totalCard: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  totalLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 2,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
  },
  fullWidthFieldContainer: {
    width: SCREEN_WIDTH - 32,
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
});
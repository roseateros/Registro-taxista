import { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  Modal,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useTransactions, TransactionTypes } from '../context/TransactionsContext';
import Colors from '../constants/Colors';
import { router } from 'expo-router';

type InputField = {
  description: string;
  amount: string;
};

const INCOME_SOURCES = ['Taximeter Card', 'Taximeter Cash', 'FreeNow App Cash', 'FreeNow App Card', 'Tips and other'];

const getInitialFields = (type: TransactionTypes): InputField[] => {
  if (type === TransactionTypes.INCOME) {
    return INCOME_SOURCES.map(description => ({
      description,
      amount: '',
    }));
  }
  return [{ description: '', amount: '' }];
};

export default function AddTransaction() {
  const [type, setType] = useState<TransactionTypes>(TransactionTypes.EXPENSE);
  const [fields, setFields] = useState<InputField[]>(getInitialFields(type));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const { addTransaction } = useTransactions();

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (event.type === 'set' && date) {
      setSelectedDate(date);
    }
  };

  const handleTypeChange = (newType: TransactionTypes) => {
    setType(newType);
    setFields(getInitialFields(newType));
  };

  const updateField = (index: number, field: keyof InputField, value: string) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], [field]: value };
    setFields(newFields);
  };

  const getTotalAmount = () => {
    return fields.reduce((sum, field) => {
      const amount = parseFloat(field.amount) || 0;
      return sum + amount;
    }, 0);
  };

  const handleSubmit = async () => {
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
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.mainContainer}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
          <View style={[
            styles.contentContainer,
            Platform.OS === 'ios' && { paddingBottom: 20 }
          ]}>
            <ScrollView 
              contentContainerStyle={[
                styles.scrollContent,
                Platform.OS === 'ios' && { paddingBottom: 40 }
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.typeContainer}>
                <TouchableOpacity 
                  style={[
                    styles.typeButton, 
                    type === TransactionTypes.EXPENSE && styles.selectedExpenseType
                  ]}
                  onPress={() => handleTypeChange(TransactionTypes.EXPENSE)}
                >
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
                  <Text style={[
                    styles.typeText, 
                    type === TransactionTypes.INCOME && styles.selectedTypeText
                  ]}>
                    Income
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dateContainer}>
                <Text style={styles.fieldHeader}>Date</Text>
                <TouchableOpacity 
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateButtonText}>
                    {format(selectedDate, 'MMM dd, yyyy')}
                  </Text>
                </TouchableOpacity>
              </View>

              {Platform.OS === 'ios' && (
                <Modal
                  visible={showDatePicker}
                  transparent={true}
                  animationType="slide"
                >
                  <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                      <DateTimePicker
                        value={selectedDate}
                        mode="date"
                        display="inline"
                        onChange={handleDateChange}
                        themeVariant="light"
                        accentColor={Colors.primary}
                      />
                      <TouchableOpacity
                        style={styles.modalButton}
                        onPress={() => setShowDatePicker(false)}
                      >
                        <Text style={styles.modalButtonText}>Done</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
              )}

              {Platform.OS === 'android' && showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  onChange={handleDateChange}
                />
              )}

              {fields.map((field, index) => (
                <View key={index} style={styles.fieldContainer}>
                  {type === TransactionTypes.INCOME ? (
                    <>
                      <Text style={styles.fieldHeader}>{field.description}</Text>
                      <View style={styles.inputRow}>
                        <TextInput
                          style={[styles.input, styles.amountInput]}
                          placeholder="Amount"
                          value={field.amount}
                          onChangeText={(value) => updateField(index, 'amount', value)}
                          keyboardType="decimal-pad"
                        />
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={styles.fieldHeader}>Expense Details</Text>
                      <View style={styles.inputRow}>
                        <TextInput
                          style={[styles.input, styles.descriptionInput]}
                          placeholder="Description"
                          value={field.description}
                          onChangeText={(value) => updateField(index, 'description', value)}
                        />
                        <TextInput
                          style={[styles.input, styles.amountInput]}
                          placeholder="Amount"
                          value={field.amount}
                          onChangeText={(value) => updateField(index, 'amount', value)}
                          keyboardType="decimal-pad"
                        />
                      </View>
                    </>
                  )}
                </View>
              ))}

              <View style={styles.totalContainer}>
                <Text style={styles.totalText}>Total Amount:</Text>
                <Text style={[
                  styles.totalAmount,
                  { color: type === TransactionTypes.INCOME ? Colors.income : Colors.expense }
                ]}>
                  €{getTotalAmount().toFixed(2)}
                </Text>
              </View>
            </ScrollView>
          </View>

          <View style={[
            styles.buttonContainer,
            Platform.OS === 'ios' && { marginBottom: 20 }
          ]}>
            <TouchableOpacity 
              style={[
                styles.addButton, 
                { backgroundColor: type === TransactionTypes.INCOME ? Colors.income : Colors.expense }
              ]}
              onPress={handleSubmit}
            >
              <Text style={styles.addButtonText}>Add Transaction</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  typeContainer: {
    flexDirection: 'row',
    margin: 20,
    marginBottom: 10,
  },
  typeButton: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: 5,
    borderRadius: 10,
  },
  selectedExpenseType: {
    backgroundColor: Colors.expense,
  },
  selectedIncomeType: {
    backgroundColor: Colors.income,
  },
  typeText: {
    fontSize: 16,
    color: Colors.text,
  },
  selectedTypeText: {
    color: Colors.white,
  },
  fieldContainer: {
    marginHorizontal: 20,
    marginVertical: 10,
  },
  fieldHeader: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 5,
    color: Colors.text,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    backgroundColor: Colors.white,
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
  },
  descriptionInput: {
    flex: 2,
  },
  amountInput: {
    flex: 1,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    margin: 20,
    padding: 15,
    borderRadius: 10,
  },
  totalText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  buttonContainer: {
    padding: 20,
    backgroundColor: Colors.background,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: -2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  addButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '500',
  },
  dateContainer: {
    marginHorizontal: 20,
    marginVertical: 10,
  },
  dateButton: {
    backgroundColor: Colors.white,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 16,
    color: Colors.text,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalButton: {
    marginTop: 10,
    padding: 15,
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  modalButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '500',
  },
});
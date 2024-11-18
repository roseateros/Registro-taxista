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
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useTransactions, TransactionTypes } from '../context/TransactionsContext';
import Colors from '../constants/Colors';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type InputField = {
  description: string;
  amount: string;
};

const INCOME_SOURCES = ['Taximeter Card', 'Taximeter Cash', 'FreeNow App Cash', 'FreeNow App Card','FreeNow Via App', 'Tips and other'];

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
  const [animation] = useState(new Animated.Value(0));

  const animateTypeChange = (newType: TransactionTypes) => {
    Animated.sequence([
      Animated.timing(animation, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(animation, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      handleTypeChange(newType);
    });
  };

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

  const renderField = (field: InputField, index: number) => {
    if (type === TransactionTypes.INCOME) {
      return (
        <View key={index} style={styles.cardContainer}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons 
              name="cash-register" 
              size={24} 
              color={Colors.income} 
            />
            <Text style={styles.cardTitle}>{field.description}</Text>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.amountContainer}>
              <Text style={styles.currencySymbol}>€</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                value={field.amount}
                onChangeText={(value) => updateField(index, 'amount', value)}
                keyboardType="decimal-pad"
                placeholderTextColor={Colors.placeholder}
              />
            </View>
          </View>
        </View>
      );
    }

    return (
      <View key={index} style={styles.cardContainer}>
        <TextInput
          style={styles.descriptionInput}
          placeholder="Description"
          value={field.description}
          onChangeText={(value) => updateField(index, 'description', value)}
          placeholderTextColor={Colors.placeholder}
        />
        <View style={styles.amountContainer}>
          <Text style={styles.currencySymbol}>€</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0.00"
            value={field.amount}
            onChangeText={(value) => updateField(index, 'amount', value)}
            keyboardType="decimal-pad"
            placeholderTextColor={Colors.placeholder}
          />
        </View>
      </View>
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.mainContainer}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
          <Animated.View 
            style={[
              styles.contentContainer,
              { opacity: animation.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }
            ]}
          >
            <View style={styles.header}>
              <View style={styles.typeContainer}>
                <TouchableOpacity 
                  style={[
                    styles.typeButton, 
                    type === TransactionTypes.EXPENSE && styles.selectedExpenseType
                  ]}
                  onPress={() => animateTypeChange(TransactionTypes.EXPENSE)}
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
                  onPress={() => animateTypeChange(TransactionTypes.INCOME)}
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

            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {fields.map((field, index) => renderField(field, index))}

              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={[
                  styles.totalAmount,
                  { color: type === TransactionTypes.INCOME ? Colors.income : Colors.expense }
                ]}>
                  €{getTotalAmount().toFixed(2)}
                </Text>
              </View>
            </ScrollView>

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
          </Animated.View>

          {(Platform.OS === 'ios' || showDatePicker) && (
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
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: Colors.white,
    borderRadius: 12,
    gap: 8,
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
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    gap: 8,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    gap: 12,
  },
  cardContainer: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  cardContent: {
    marginTop: 8,
  },
  descriptionInput: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 12,
    padding: 0,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.text,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: Colors.text,
    padding: 0,
  },
  totalCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginTop: 4,
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
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: '700',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
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
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  modalButton: {
    marginTop: 16,
    padding: 16,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});


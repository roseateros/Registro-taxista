import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
  SectionList,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { format, parse, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";
import {
  useTransactions,
  TransactionTypes,
} from "../context/TransactionsContext.js";
import Colors from "../constants/Colors";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import * as Print from 'expo-print';

export default function Home() {
  const { transactions, deleteTransaction } = useTransactions();
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Calculate current month's balance
  const getCurrentMonthBalance = () => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);

    return transactions.reduce((total, transaction) => {
      const transactionDate = new Date(transaction.date);
      if (isWithinInterval(transactionDate, { start, end })) {
        return total + (transaction.type === TransactionTypes.INCOME ? transaction.amount : -transaction.amount);
      }
      return total;
    }, 0);
  };

  const exportToPDF = async () => {
    if (!startDate && !endDate) {
      Alert.alert("Select Date Range", "Please select a date range to export");
      return;
    }

    const createHTMLContent = () => {
      let netBalance = 0;

      // Filter transactions based on date range
      const filteredTransactions = transactions.filter((transaction) => {
        if (!startDate && !endDate) return true;
        const transactionDate = new Date(transaction.date);
        const start = startDate || new Date(0);
        const end = endDate || new Date(2099, 11, 31);
        return isWithinInterval(transactionDate, { start, end });
      });

      // Sort transactions by date
      const sortedTransactions = [...filteredTransactions].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      // Calculate net balance
      sortedTransactions.forEach(t => {
        netBalance += t.type === TransactionTypes.INCOME ? t.amount : -t.amount;
      });

      // Generate HTML for transactions
      const generateTransactionRows = (transactions) => {
        return transactions.map((t) => `
          <tr>
            <td>${format(new Date(t.date), "MMM dd, yyyy")}</td>
            <td>${t.description}</td>
            <td style="text-align: right; color: ${
              t.type === TransactionTypes.INCOME ? "green" : "red"
            }">
              ${t.type === TransactionTypes.INCOME ? "+" : "-"}€${t.amount.toFixed(2)}
            </td>
          </tr>
        `).join("");
      };

      return `
        <html>
          <head>
            <style>
              body { 
                font-family: Arial, sans-serif;
                padding: 20px;
                font-size: 12px;
              }
              table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-bottom: 20px;
              }
              th, td { 
                border: 1px solid #ddd; 
                padding: 8px; 
              }
              th { 
                background-color: #f2f2f2; 
                text-align: left;
              }
              .summary { 
                margin: 20px 0;
                padding: 15px;
                background-color: #f8f9fa;
                border-radius: 5px;
              }
              .total-row {
                font-weight: bold;
                background-color: #f8f9fa;
              }
            </style>
          </head>
          <body>
            <h1>Transaction Report</h1>
            <p>Period: ${
              startDate ? format(startDate, "MMM dd, yyyy") : "Start"
            } to ${endDate ? format(endDate, "MMM dd, yyyy") : "End"}</p>
            
            <div class="summary">
              <h2>Summary</h2>
              <p>Net Balance: ${netBalance >= 0 ? "+" : ""}€${netBalance.toFixed(2)}</p>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${generateTransactionRows(sortedTransactions)}
                <tr class="total-row">
                  <td colspan="2">Net Balance</td>
                  <td style="text-align: right; color: ${netBalance >= 0 ? "green" : "red"}">
                    ${netBalance >= 0 ? "+" : ""}€${netBalance.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </body>
        </html>
      `;
    };

    try {
      const { uri } = await Print.printToFileAsync({
        html: createHTMLContent(),
        base64: false
      });

      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf'
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      Alert.alert("Error", "Failed to generate PDF report");
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      "Delete Transaction",
      "Are you sure you want to delete this transaction?",
      [
        { text: "Cancel" },
        { text: "Delete", onPress: () => deleteTransaction(id) },
      ]
    );
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleDateChange = (
    event: DateTimePickerEvent,
    date?: Date,
    isStart: boolean = true
  ) => {
    if (Platform.OS === "android") {
      if (isStart) {
        setShowStartPicker(false);
      } else {
        setShowEndPicker(false);
      }
    }

    if (event.type === "set" && date) {
      if (isStart) {
        setStartDate(date);
      } else {
        setEndDate(date);
      }
    }
  };

  const clearDates = () => {
    setStartDate(null);
    setEndDate(null);
  };

  // Filter transactions based on date range
  const filteredTransactions = transactions.filter((transaction) => {
    if (!startDate && !endDate) return true;

    const transactionDate = new Date(transaction.date);
    const start = startDate || new Date(0);
    const end = endDate || new Date(2099, 11, 31);

    return isWithinInterval(transactionDate, { start, end });
  });

  // Group transactions by date only
  const groupedTransactions = filteredTransactions.reduce(
    (groups, transaction) => {
      const date = format(new Date(transaction.date), "yyyy-MM-dd");
      const key = date;

      if (!groups[key]) {
        groups[key] = {
          date,
          transactions: [],
          balance: 0,
        };
      }

      groups[key].transactions.push(transaction);
      groups[key].balance += transaction.type === TransactionTypes.INCOME ? 
        transaction.amount : -transaction.amount;

      return groups;
    },
    {}
  );

  // Convert grouped transactions to sections
  const sections = Object.entries(groupedTransactions)
    .map(([key, group]) => ({
      id: key,
      title: format(new Date(group.date), "MMM dd, yyyy"),
      data: expandedSections.includes(key) ? group.transactions : [],
      balance: group.balance,
    }))
    .sort((a, b) => new Date(b.title).getTime() - new Date(a.title).getTime());

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceTitle}>Current Month Balance</Text>
          <Text
            style={[styles.balanceAmount, getCurrentMonthBalance() < 0 && styles.negative]}
          >
            {getCurrentMonthBalance() >= 0 ? "+" : ""}€{getCurrentMonthBalance().toFixed(2)}
          </Text>
        </View>

        <View style={styles.dateFilterContainer}>
          <View style={styles.dateInputsRow}>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowStartPicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {startDate ? format(startDate, "MMM dd, yyyy") : "Start Date"}
              </Text>
            </TouchableOpacity>

            <Text style={styles.dateButtonText}>to</Text>

            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowEndPicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {endDate ? format(endDate, "MMM dd, yyyy") : "End Date"}
              </Text>
            </TouchableOpacity>
          </View>

          {(startDate || endDate) && (
            <TouchableOpacity style={styles.clearButton} onPress={clearDates}>
              <Text style={styles.clearButtonText}>Clear Dates</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.exportButton} onPress={exportToPDF}>
            <Text style={styles.exportButtonText}>Export to PDF</Text>
          </TouchableOpacity>
        </View>

        {/* Date Pickers */}
        {Platform.OS === "android" && showStartPicker && (
          <DateTimePicker
            value={startDate || new Date()}
            mode="date"
            onChange={(event, date) => handleDateChange(event, date, true)}
            themeVariant="light"
            style={{ backgroundColor: Colors.white }}
            textColor={Colors.text}
          />
        )}

        {Platform.OS === "android" && showEndPicker && (
          <DateTimePicker
            value={endDate || new Date()}
            mode="date"
            onChange={(event, date) => handleDateChange(event, date, false)}
            themeVariant="light"
            style={{ backgroundColor: Colors.white }}
            textColor={Colors.text}
          />
        )}

        {Platform.OS === "ios" && (
          <>
            <Modal
              visible={showStartPicker}
              transparent={true}
              animationType="slide"
            >
              <View style={styles.modalContainer}>
                <View style={[styles.modalContent, { backgroundColor: Colors.white }]}>
                  <DateTimePicker
                    value={startDate || new Date()}
                    mode="date"
                    display="inline"
                    onChange={(event, date) => handleDateChange(event, date, true)}
                    themeVariant="light"
                    textColor={Colors.text}
                    accentColor={Colors.primary}
                  />
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={() => setShowStartPicker(false)}
                  >
                    <Text style={styles.modalButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            <Modal
              visible={showEndPicker}
              transparent={true}
              animationType="slide"
            >
              <View style={styles.modalContainer}>
                <View style={[styles.modalContent, { backgroundColor: Colors.white }]}>
                  <DateTimePicker
                    value={endDate || new Date()}
                    mode="date"
                    display="inline"
                    onChange={(event, date) => handleDateChange(event, date, false)}
                    themeVariant="light"
                    textColor={Colors.text}
                    accentColor={Colors.primary}
                  />
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={() => setShowEndPicker(false)}
                  >
                    <Text style={styles.modalButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </>
        )}

        <SectionList
          style={styles.sectionList}
          contentContainerStyle={styles.sectionListContent}
          sections={[{ title: "Transactions", data: sections }]}
          keyExtractor={(item, index) => item.id || index.toString()}
          renderItem={({ item: section }) => (
            <TouchableOpacity
              style={styles.dateSection}
              onPress={() => toggleSection(section.id)}
            >
              <View style={styles.dateSectionHeader}>
                <Text style={styles.dateSectionTitle}>{section.title}</Text>
                <Text
                  style={[
                    styles.dateSectionTotal,
                    section.balance >= 0 ? styles.income : styles.expense,
                  ]}
                >
                  {section.balance >= 0 ? "+" : ""}€{section.balance.toFixed(2)}
                </Text>
              </View>

              {section.data.map((transaction) => (
                <TouchableOpacity
                  key={transaction.id}
                  style={styles.transaction}
                  onLongPress={() => handleDelete(transaction.id)}
                >
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionTitle}>
                      {transaction.description}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.transactionAmount,
                      transaction.type === TransactionTypes.INCOME
                        ? styles.income
                        : styles.expense,
                    ]}
                  >
                    {transaction.type === TransactionTypes.INCOME ? "+" : "-"}€{transaction.amount.toFixed(2)}
                  </Text>
                </TouchableOpacity>
              ))}
            </TouchableOpacity>
          )}
        />
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/add-transaction")}
        >
          <Text style={styles.addButtonText}>+ Add Transaction</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    flex: 1,
  },
  balanceContainer: {
    padding: 20,
    backgroundColor: Colors.white,
    marginBottom: 10,
  },
  balanceTitle: {
    fontSize: 16,
    color: Colors.text,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: "bold",
    color: Colors.income,
  },
  negative: {
    color: Colors.expense,
  },
  dateFilterContainer: {
    padding: 10,
  },
  dateInputsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  dateButton: {
    flex: 1,
    backgroundColor: Colors.white,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  dateButtonText: {
    color: Colors.text,
    fontSize: 14,
  },
  clearButton: {
    marginTop: 8,
    padding: 8,
    alignItems: "center",
  },
  clearButtonText: {
    color: Colors.primary,
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
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
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  modalButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "500",
  },
  dateSection: {
    backgroundColor: Colors.white,
    marginBottom: 1,
  },
  dateSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: Colors.white + "80",
  },
  dateSectionTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.text,
  },
  dateSectionTotal: {
    fontSize: 16,
    fontWeight: "500",
  },
  transaction: {
    flexDirection: "row",
    padding: 15,
    paddingLeft: 30,
    backgroundColor: Colors.white,
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.text + "10",
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 14,
    color: Colors.text,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: "500",
  },
  income: {
    color: Colors.income,
  },
  expense: {
    color: Colors.expense,
  },
  sectionList: {
    flex: 1,
  },
  sectionListContent: {
    paddingBottom: 80, // Add padding to prevent content from being hidden behind the button
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.text + "10",
  },
  addButton: {
    backgroundColor: Colors.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "500",
  },
  exportButton: {
    marginTop: 10,
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  exportButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "500",
  },
});
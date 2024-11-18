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
  StatusBar,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";
import { useTransactions, TransactionTypes } from "../context/TransactionsContext";
import Colors from "../constants/Colors";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import { MaterialIcons } from "@expo/vector-icons";

export default function Home() {
  const { transactions, deleteTransaction, importTransactions, exportTransactions } = useTransactions();
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [expandedSections, setExpandedSections] = useState([]);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

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

  const handleImport = async () => {
    try {
      await importTransactions();
     Alert.alert("Success", "Transactions imported successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to import transactions.");
    }
  };

  const handleExport = async () => {
    try {
      await exportTransactions();
      Alert.alert("Success", "Transactions exported successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to export transactions.");
    }
  };

  const createHTMLContent = () => {
    let netBalance = 0;

    const filteredTransactions = transactions.filter((transaction) => {
      if (!startDate && !endDate) return true;
      const transactionDate = new Date(transaction.date);
      const start = startDate || new Date(0);
      const end = endDate || new Date(2099, 11, 31);
      return isWithinInterval(transactionDate, { start, end });
    });

    const sortedTransactions = [...filteredTransactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    sortedTransactions.forEach((t) => {
      netBalance += t.type === TransactionTypes.INCOME ? t.amount : -t.amount;
    });

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
          <p>Period: ${startDate ? format(startDate, "MMM dd, yyyy") : "Start"} to ${endDate ? format(endDate, "MMM dd, yyyy") : "End"}</p>
          
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
              ${sortedTransactions
                .map(
                  (t) => `
                <tr>
                  <td>${format(new Date(t.date), "MMM dd, yyyy")}</td>
                  <td>${t.description}</td>
                  <td style="text-align: right; color: ${t.type === TransactionTypes.INCOME ? "green" : "red"}">
                    ${t.type === TransactionTypes.INCOME ? "+" : "-"}€${t.amount.toFixed(2)}
                  </td>
                </tr>
              `
                )
                .join("")}
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

  const exportToPDF = () => {
    setShowExportModal(true);
  };

  const handleExportWithDates = async () => {
    if (!startDate && !endDate) {
      Alert.alert("Select Date Range", "Please select a date range to export");
      return;
    }

    try {
      const { uri } = await Print.printToFileAsync({
        html: createHTMLContent(),
        base64: false,
      });

      await Sharing.shareAsync(uri, {
        UTI: ".pdf",
        mimeType: "application/pdf",
      });
      
      setShowExportModal(false);
    } catch (error) {
      console.error("Error generating PDF:", error);
      Alert.alert("Error", "Failed to generate PDF report");
    }
  };

  const handleDelete = (id) => {
    Alert.alert(
      "Delete Transaction",
      "Are you sure you want to delete this transaction?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => deleteTransaction(id) 
        },
      ]
    );
  };

  const toggleSection = (sectionId) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleDateChange = (event, date, isStart = true) => {
    if (Platform.OS === "android") {
      isStart ? setShowStartPicker(false) : setShowEndPicker(false);
    }

    if (event.type === "set" && date) {
      if (isStart) {
        setStartDate(date);
        if (endDate && date > endDate) {
          setEndDate(date);
        }
      } else {
        if (startDate && date < startDate) {
          Alert.alert("Invalid Date", "End date cannot be before start date");
          return;
        }
        setEndDate(date);
      }
    }
  };

  const clearDates = () => {
    setStartDate(null);
    setEndDate(null);
  };

  const sections = transactions
    .filter((transaction) => {
      if (!startDate && !endDate) return true;
      const transactionDate = new Date(transaction.date);
      const start = startDate || new Date(0);
      const end = endDate || new Date(2099, 11, 31);
      return isWithinInterval(transactionDate, { start, end });
    })
    .reduce((groups, transaction) => {
      const date = format(new Date(transaction.date), "yyyy-MM-dd");
      if (!groups[date]) {
        groups[date] = {
          id: date,
          title: format(new Date(transaction.date), "MMM dd, yyyy"),
          data: [],
          balance: 0,
        };
      }
      groups[date].data.push(transaction);
      groups[date].balance +=
        transaction.type === TransactionTypes.INCOME
          ? transaction.amount
          : -transaction.amount;
      return groups;
    }, {});

  const sectionList = Object.values(sections)
    .map((section) => ({
      ...section,
      data: expandedSections.includes(section.id) ? section.data : [],
    }))
    .sort((a, b) => new Date(b.id).getTime() - new Date(a.id).getTime());

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.monthText}>
            {format(new Date(), 'MMMM yyyy')}
          </Text>
          <Text style={styles.balanceTitle}>Current Month Balance</Text>
          <Text style={[styles.balanceAmount, getCurrentMonthBalance() < 0 && styles.negative]}>
            {getCurrentMonthBalance() >= 0 ? "" : ""}€{getCurrentMonthBalance().toFixed(2)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setMenuVisible(true)}
        >
          <MaterialIcons name="more-vert" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => router.push("/add-transaction")}
        >
          <MaterialIcons name="add" size={24} color={Colors.primary} />
          <Text style={styles.quickActionText}>Add</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={exportToPDF}
        >
          <MaterialIcons name="picture-as-pdf" size={24} color={Colors.primary} />
          <Text style={styles.quickActionText}>Export</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={handleImport}
        >
          <MaterialIcons name="file-upload" size={24} color={Colors.primary} />
          <Text style={styles.quickActionText}>Import</Text>
        </TouchableOpacity>
      </View>

      {/* Transactions List */}
      <SectionList
        style={styles.sectionList}
        contentContainerStyle={styles.sectionListContent}
        sections={sectionList}
        keyExtractor={(item, index) => item.id || index.toString()}
        renderItem={({ item: transaction }) => (
          <TouchableOpacity
            style={styles.transaction}
            onLongPress={() => handleDelete(transaction.id)}
          >
            <View style={styles.transactionInfo}>
              <Text style={styles.transactionTitle}>
                {transaction.description}
              </Text>
            </View>
            <View style={styles.amountContainer}>
              <MaterialIcons 
                name={transaction.type === TransactionTypes.INCOME ? "arrow-upward" : "arrow-downward"} 
                size={16} 
                color={transaction.type === TransactionTypes.INCOME ? Colors.income : Colors.expense} 
              />
              <Text
                style={[
                  styles.transactionAmount,
                  transaction.type === TransactionTypes.INCOME
                    ? styles.income
                    : styles.expense,
                ]}
              >
                €{transaction.amount.toFixed(2)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        renderSectionHeader={({ section }) => (
          <TouchableOpacity
            style={styles.dateSection}
            onPress={() => toggleSection(section.id)}
          >
            <View style={styles.dateSectionHeader}>
              <View style={styles.dateSectionLeft}>
                <MaterialIcons 
                  name={expandedSections.includes(section.id) ? "expand-more" : "chevron-right"} 
                  size={24} 
                  color={Colors.text} 
                />
                <Text style={styles.dateSectionTitle}>{section.title}</Text>
              </View>
              <Text
                style={[
                  styles.dateSectionTotal,
                  section.balance >= 0 ? styles.income : styles.expense,
                ]}
              >
                {section.balance >= 0 ? "+" : ""}€{section.balance.toFixed(2)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Export Date Filter Modal */}
      <Modal
        visible={showExportModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.exportModalOverlay}>
          <View style={styles.exportModalContent}>
            <View style={styles.exportModalHeader}>
              <Text style={styles.exportModalTitle}>Select Date Range</Text>
              <TouchableOpacity
                onPress={() => setShowExportModal(false)}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.dateFilterContainer}>
              <View style={styles.dateInputsRow}>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowStartPicker(true)}
                >
                  <MaterialIcons name="event" size={20} color={Colors.primary} />
                  <Text style={styles.dateButtonText}>
                    {startDate ? format(startDate, "MMM dd, yyyy") : "Start Date"}
                  </Text>
                </TouchableOpacity>

                <MaterialIcons name="arrow-forward" size={20} color={Colors.text} />

                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowEndPicker(true)}
                >
                  <MaterialIcons name="event" size={20} color={Colors.primary} />
                  <Text style={styles.dateButtonText}>
                    {endDate ? format(endDate, "MMM dd, yyyy") : "End Date"}
                  </Text>
                </TouchableOpacity>
              </View>

              {(startDate || endDate) && (
                <TouchableOpacity 
                  style={styles.clearDateButton}
                  onPress={clearDates}
                >
                  <MaterialIcons name="clear" size={20} color={Colors.white} />
                  <Text style={styles.clearDateButtonText}>Clear Dates</Text>
                </TouchableOpacity>
              )}
            </View>

<TouchableOpacity
              style={styles.exportButton}
              onPress={handleExportWithDates}
            >
              <MaterialIcons name="file-download" size={20} color={Colors.white} />
              <Text style={styles.exportButtonText}>Export to PDF</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContent}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                handleExport();
              }}
            >
              <MaterialIcons name="save-alt" size={24} color={Colors.text} />
              <Text style={styles.menuItemText}>Export Data</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                handleImport();
              }}
            >
              <MaterialIcons name="upload-file" size={24} color={Colors.text} />
              <Text style={styles.menuItemText}>Import Data</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Date Pickers */}
      {(showStartPicker || showEndPicker) && (
        <DateTimePicker
          value={showStartPicker ? (startDate || new Date()) : (endDate || new Date())}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, date) => handleDateChange(event, date, showStartPicker)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    padding: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  monthText: {
    color: Colors.white,
    fontSize: 16,
    opacity: 0.8,
  },
  balanceTitle: {
    color: Colors.white,
    fontSize: 14,
    marginTop: 8,
  },
  balanceAmount: {
    color: Colors.white,
    fontSize: 32,
    fontWeight: 'bold',
  },
  menuButton: {
    padding: 8,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: Colors.white,
    borderRadius: 8,
    margin: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickActionButton: {
    alignItems: 'center',
  },
  quickActionText: {
    color: Colors.text,
    marginTop: 4,
    fontSize: 12,
  },
  sectionList: {
    flex: 1,
  },
  sectionListContent: {
    paddingBottom: 20,
  },
  dateSection: {
    backgroundColor: Colors.white,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0,
    borderBottomColor: Colors.border,
  },
  dateSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateSectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateSectionTitle: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 8,
  },
  dateSectionTotal: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  transaction: {
    backgroundColor: Colors.white,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 0,
    borderBottomColor: Colors.border,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    color: Colors.text,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  income: {
    color: Colors.income,
  },
  expense: {
    color: Colors.expense,
  },
  negative: {
    color: Colors.expense,
  },
  exportModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  exportModalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  exportModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  exportModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  dateFilterContainer: {
    marginBottom: 20,
  },
  dateInputsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 8,
  },
  dateButtonText: {
    marginLeft: 8,
    color: Colors.text,
  },
  clearDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 8,
  },
  clearDateButtonText: {
    color: Colors.white,
    marginLeft: 8,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 8,
  },
  exportButtonText: {
    color: Colors.white,
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuItemText: {
    marginLeft: 16,
    fontSize: 16,
    color: Colors.text,
  },
});
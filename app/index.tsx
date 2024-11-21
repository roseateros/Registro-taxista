import React, { useState, useCallback, useMemo } from 'react';
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
  SafeAreaView,
} from 'react-native';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { format, isWithinInterval, startOfMonth, endOfMonth, parseISO, isSameMonth, isAfter, isBefore, isSameDay } from 'date-fns';
import { useTransactions, TransactionTypes } from '../context/TransactionsContext';
import Colors from '../constants/Colors';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

export default function Home() {
  const { transactions, deleteTransaction, importTransactions, exportTransactions } = useTransactions();
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [expandedSections, setExpandedSections] = useState([]);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const getMonthBalance = useCallback((date) => {
    const start = startOfMonth(date);
    const end = endOfMonth(date);

    return transactions.reduce((total, transaction) => {
      const transactionDate = parseISO(transaction.date);
      if (isWithinInterval(transactionDate, { start, end })) {
        return total + (transaction.type === TransactionTypes.INCOME ? transaction.amount : -transaction.amount);
      }
      return total;
    }, 0);
  }, [transactions]);

  const handleConfirmDate = useCallback((date, isStart = true, isMonthPicker = false) => {
    if (isMonthPicker) {
      setSelectedMonth(new Date(date.getFullYear(), date.getMonth(), 1));
      setStartDate(null);
      setEndDate(null);
    } else if (isStart) {
      setStartDate(date);
      if (endDate && date > endDate) {
        setEndDate(date);
      }
    } else {
      if (startDate && date < startDate) {
        Alert.alert('Invalid Date', 'End date cannot be before start date');
        return;
      }
      setEndDate(date);
    }
    setShowStartPicker(false);
    setShowEndPicker(false);
    setShowMonthPicker(false);
  }, [startDate, endDate]);

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

  const createHTMLContent = useCallback(() => {
    let netBalance = 0;

    const filteredTransactions = transactions.filter((transaction) => {
      if (!startDate && !endDate) return true;
      const transactionDate = parseISO(transaction.date);
      const start = startDate || new Date(0);
      const end = endDate || new Date(2099, 11, 31);
      return isWithinInterval(transactionDate, { start, end });
    });

    const sortedTransactions = [...filteredTransactions].sort(
      (a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()
    );

    sortedTransactions.forEach((t) => {
      netBalance += t.type === TransactionTypes.INCOME ? t.amount : -t.amount;
    });

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Informe de ganancias con taxi </title>
</head>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #333; margin: 20px; padding: 0; background-color: #fff;">

    <!-- Header -->
    <div class="header" style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #444; font-weight: normal; margin-bottom: 10px;">Informe de ganancias con taxi</h1>
        <div style="font-size: 12px; color: #08612DFF;">
            Período: ${startDate ? format(startDate, 'dd/MM/yyyy') : 'Inicio'} - ${endDate ? format(endDate, 'dd/MM/yyyy') : 'Fin'}
        </div>
    </div>

    <!-- Summary -->
    <div class="summary" style="margin-bottom: 20px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; background-color: #f9f9f9;">
        <h2 style="color: #444; font-weight: normal; margin-bottom: 10px;">Resumen de los movimientos</h2>
        <p style="margin: 0;">Balance Neto: 
            <span style="font-weight: bold; color: ${netBalance >= 0 ? '#08612DFF' : '#c0392b'};">
                €${netBalance.toFixed(2)}
            </span>
        </p>
    </div>

    <!-- Transaction Table -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
            <tr>
                <th style="text-align: left; padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;">Fecha</th>
                <th style="text-align: left; padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;">Descripción</th>
                <th style="text-align: left; padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;">Cantidad</th>
            </tr>
        </thead>
        <tbody>
            ${sortedTransactions.map((t) => `
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;">${format(parseISO(t.date), 'dd/MM/yyyy')}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${t.description}</td>
                    <td style="padding: 8px; text-align: right; border: 1px solid #ddd; color: ${t.type === TransactionTypes.INCOME ? '#08612DFF' : '#c0392b'};">
                        ${t.type === TransactionTypes.INCOME ? '+' : '-'}€${t.amount.toFixed(2)}
                    </td>
                </tr>`).join('')}
            <tr>
                <td colspan="2" style="font-weight: bold; padding: 8px; border: 1px solid #ddd;">Balance Neto</td>
                <td style="padding: 8px; text-align: right; font-weight: bold; border: 1px solid #ddd; color: ${netBalance >= 0 ? '#08612DFF' : '#c0392b'};">
                    ${netBalance >= 0 ? '+' : ''}€${netBalance.toFixed(2)}
                </td>
            </tr>
        </tbody>
    </table>

    <!-- Footer -->
    <div class="footer" style="text-align: center; font-size: 12px; color: #08612DFF; border-top: 1px solid #ddd; padding-top: 10px;">
        Informe generado automáticamente | ${format(new Date(), 'dd/MM/yyyy HH:mm')}
    </div>
</body>
</html>

`;
  }, [transactions, startDate, endDate]);

  const handleExportToPDF = useCallback(async () => {
    try {
      const { uri } = await Print.printToFileAsync({
        html: createHTMLContent(),
        base64: false,
      });

      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
      });
    } catch (error) {
      console.error('Error al generar PDF:', error);
      Alert.alert('Error', 'No se pudo generar el informe PDF');
    }
  }, [createHTMLContent]);

  const handleDelete = useCallback((id) => {
    Alert.alert(
      'Eliminar Transacción',
      '¿Estás seguro de que quieres eliminar esta transacción?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteTransaction(id)
        },
      ]
    );
  }, [deleteTransaction]);

  const toggleSection = useCallback((sectionId) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  }, []);

  const clearDates = useCallback(() => {
    setStartDate(null);
    setEndDate(null);
    setSelectedMonth(new Date());
  }, []);

  const sections = useMemo(() => {
    const filteredTransactions = transactions.filter((transaction) => {
      const transactionDate = parseISO(transaction.date);
      if (startDate && endDate) {
        return isWithinInterval(transactionDate, { start: startDate, end: endDate });
      } else if (startDate) {
        return isAfter(transactionDate, startDate) || isSameDay(transactionDate, startDate);
      } else if (endDate) {
        return isBefore(transactionDate, endDate) || isSameDay(transactionDate, endDate);
      }
      return isSameMonth(transactionDate, selectedMonth);
    });

    const groups = filteredTransactions.reduce((acc, transaction) => {
      const date = format(parseISO(transaction.date), 'yyyy-MM-dd');
      if (!acc[date]) {
        acc[date] = {
          id: date,
          title: format(parseISO(transaction.date), 'dd/MM/yyyy'),
          data: [],
          balance: 0,
        };
      }
      acc[date].data.push(transaction);
      acc[date].balance +=
        transaction.type === TransactionTypes.INCOME
          ? transaction.amount
          : -transaction.amount;
      return acc;
    }, {});

    return Object.values(groups)
      .map((section) => ({
        ...section,
        data: expandedSections.includes(section.id) ? section.data : [],
      }))
      .sort((a, b) => parseISO(b.id).getTime() - parseISO(a.id).getTime());
  }, [transactions, startDate, endDate, selectedMonth, expandedSections]);

  const renderItem = useCallback(({ item: transaction }) => (
    <TouchableOpacity
      style={styles.transaction}
      onLongPress={() => handleDelete(transaction.id)}
    >
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionTitle}>
          {transaction.description}
        </Text>
        <Text style={styles.transactionDate}>
          {format(parseISO(transaction.date), 'HH:mm')}
        </Text>
      </View>
      <View style={styles.amountContainer}>
        <MaterialIcons
          name={transaction.type === TransactionTypes.INCOME ? 'arrow-upward' : 'arrow-downward'}
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
  ), [handleDelete]);

  const renderSectionHeader = useCallback(({ section }) => (
    <TouchableOpacity
      style={styles.dateSection}
      onPress={() => toggleSection(section.id)}
    >
      <View style={styles.dateSectionHeader}>
        <View style={styles.dateSectionLeft}>
          <MaterialIcons
            name={expandedSections.includes(section.id) ? 'expand-more' : 'chevron-right'}
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
          {section.balance >= 0 ? '+' : ''}€{section.balance.toFixed(2)}
        </Text>
      </View>
    </TouchableOpacity>
  ), [expandedSections, toggleSection]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => setShowMonthPicker(true)} style={styles.monthSelector}>
            <Text style={styles.monthText}>
              {format(selectedMonth || new Date(), 'MMMM yyyy')}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.balanceTitle}>Selected month's available balance</Text>
          <Text style={[styles.balanceAmount, getMonthBalance(selectedMonth) < 0 && styles.negative]}>
            {getMonthBalance(selectedMonth) >= 0 ? '+' : ''}€{getMonthBalance(selectedMonth).toFixed(2)}
          </Text>
        </View>
       <TouchableOpacity
      style={styles.menuButton}
      onPress={() => setMenuVisible(true)}
    >
      <View style={styles.iconContainer}>
        <MaterialIcons name="settings" size={24} color={Colors.white} />
        <Text style={styles.buttonText}>PRO</Text> 
      </View>
    </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => router.push('/add-transaction')}
        >
          <MaterialIcons name="add" size={26} color={Colors.primary} />
          <Text style={styles.quickActionText}>Añadir</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => setShowFilterModal(true)}
        >
          <MaterialIcons name="filter-list" size={26} color={Colors.primary} />
          <Text style={styles.quickActionText}>Filtrar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={handleExportToPDF}
        >
          <MaterialIcons name="picture-as-pdf" size={26} color={Colors.primary} />
          <Text style={styles.quickActionText}>Exportar PDF</Text>
        </TouchableOpacity>
      </View>

      {/* Transactions List */}
      <SectionList
        style={styles.sectionList}
        contentContainerStyle={styles.sectionListContent}
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
      />

      {/* Date Pickers */}
      <DateTimePickerModal
        isVisible={showStartPicker}
        mode="date"
        onConfirm={(date) => handleConfirmDate(date, true)}
        onCancel={() => setShowStartPicker(false)}
        date={startDate || new Date()}
      />
      <DateTimePickerModal
        isVisible={showEndPicker}
        mode="date"
        onConfirm={(date) => handleConfirmDate(date, false)}
        onCancel={() => setShowEndPicker(false)}
        date={endDate || new Date()}
        minimumDate={startDate}
      />
      <DateTimePickerModal
        isVisible={showMonthPicker}
        mode="date"
        onConfirm={(date) => {
          handleConfirmDate(new Date(date.getFullYear(), date.getMonth(), 1), false, true);
        }}
        onCancel={() => setShowMonthPicker(false)}
        date={selectedMonth || new Date()}
        display="spinner"
      />

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtrar Transacciones</Text>
              <TouchableOpacity
                onPress={() => setShowFilterModal(false)}
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
                    {startDate ? format(startDate, 'dd/MM/yyyy') : 'Fecha Inicial'}
                  </Text>
                </TouchableOpacity>

                <MaterialIcons name="arrow-forward" size={20} color={Colors.text} />

                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowEndPicker(true)}
                >
                  <MaterialIcons name="event" size={20} color={Colors.primary} />
                  <Text style={styles.dateButtonText}>
                    {endDate ? format(endDate, 'dd/MM/yyyy') : 'Fecha Final'}
                  </Text>
                </TouchableOpacity>
              </View>

              {(startDate || endDate) && (
                <TouchableOpacity
                  style={styles.clearDateButton}
                  onPress={clearDates}
                >
                  <MaterialIcons name="clear" size={20} color={Colors.white} />
                  <Text style={styles.clearDateButtonText}>Limpiar Fechas</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.applyFilterButton}
              onPress={() => {
                setShowFilterModal(false);
              }}
            >
              <MaterialIcons name="check" size={20} color={Colors.white} />
              <Text style={styles.applyFilterButtonText}>Apply Filter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
              style={styles.quickActionButton}
              onPress={handleExport}
            >
              <MaterialIcons name="file-download" size={32} color={Colors.primary} />
              <Text style={styles.quickActionText}>Export</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={handleImport}
            >
              <MaterialIcons name="file-upload" size={32} color={Colors.primary} />
              <Text style={styles.quickActionText}>Import</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    borderRadius: 50, // Circular button if needed
    backgroundColor: Colors.primary, // Button color
  },
  iconContainer: {
    alignItems: 'center', // Center the icon and text
    justifyContent: 'center',
    borderColor: Colors.white,  // Border color (green in this case)
    borderWidth: 1, // Thickness of the border
    backgroundColor: Colors.primary,  // Background color (green)
    borderRadius: 5,  // To make the container circular or rounded
    padding: 10, // Padding inside the container to give space around the icon and text
  },
  buttonText: {
    marginTop: 2, // Space between icon and text
    color: Colors.white, // Text color
    fontSize: 12, // Adjust text size as needed
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
    padding: 8,
  },
  quickActionText: {
    color: Colors.text,
    marginTop: 4,
    fontSize: 14,
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
    borderBottomWidth: 1,
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
    backgroundColor: Colors.LightOrange,
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingLeft:48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    color: Colors.text,
  },
  transactionDate: {
    fontSize: 12,
    color: Colors.text,
    marginTop: 4,
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
modalOverlay: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)', // Semi-transparent background
  justifyContent: 'center', // Center vertically
  alignItems: 'center',      // Center horizontally
  zIndex: 1000,              // Ensure it's above other content
},
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
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
  applyFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 8,
  },
  applyFilterButtonText: {
    color: Colors.white,
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },
  menuOverlay: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)', // Semi-transparent background
  justifyContent: 'center', // Center vertically
  alignItems: 'center',      // Center horizontally
  zIndex: 1000,              // Ensure it's above other content
},

  menuContent: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 60,
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
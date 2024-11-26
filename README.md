# 💶 TaxiBalance Pro Mobile App

## Overview

TaxiBalance Pro is a mobile application built with React Native that helps users efficiently track their daily income and expenses. The app provides a user-friendly interface for quickly logging financial transactions with customizable input options.

## 🌟 Features

### Dynamic Transaction Entry
- Support for both Income and Expense transactions
- Multiple input fields for detailed transaction logging
- Flexible input based on transaction type
- import and export to json file


### Income Tracking
- Predefined income sources:
  - Taximeter Card
  - Taximeter Cash
  - FreeNow App Cash
  - FreeNow App Card
  - FreeNow Via App
  - Tips and other

### Expense Tracking
- Free-form description for each expense
- Individual amount tracking

### Additional Capabilities
- Export to preformated pdf file
- Date selection for transactions
- Real-time total amount calculation
- Responsive design for iOS and Android
- Keyboard-friendly interface

## 🛠 Tech Stack

- React Native
- Expo
- TypeScript
- @react-native-community/datetimepicker
- date-fns
- Expo Router
- Custom Transactions Context

## 📦 Prerequisites

- Node.js (v16 or later)
- npm or Yarn
- Expo CLI
- React Native development environment
- iOS Simulator or Android Emulator
- Smartphone with Expo Go (optional)

## 🚀 Installation

1. Clone the repository:
```bash
git clone 
cd transaction-tracker-app
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Start the development server:
```bash
npm start
```

## 📱 Running the App

- For iOS Simulator: Press `i`
- For Android Emulator: Press `a`
- For physical device: Scan QR code with Expo Go app

## 🔧 Key Components

### Transaction Types
- **Income**: Pre-configured sources with amount entry
- **Expense**: Custom description with amount entry

### Date Handling
- Inline date picker
- Support for both iOS and Android
- Ability to select past and current dates

### State Management
- Uses React's `useState` and `useCallback`
- Custom transactions context for data persistence

## 💡 Usage Tips

1. Select transaction type (Income/Expense)
2. Choose transaction date
3. Fill in relevant fields
4. Submit transaction

## 🎨 Customization

The app uses a custom `Colors` constant for theming. You can easily modify colors in the `Colors.ts` file.

## 🔒 Error Handling

- Validation for empty fields
- Type-specific input requirements
- User-friendly error messages

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📧 Contact

Roshan Gautam

module.exports = {
  extends: ['react-app', 'react-app/jest'],
  globals: {
    BigInt: 'readonly',
    checkAndApproveToken: 'writable'
  },
  rules: {
    'no-undef': 'error'
  },
  parserOptions: {
    ecmaVersion: 2020
  }
}; 
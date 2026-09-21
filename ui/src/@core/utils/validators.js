import { isEmpty, isEmptyArray, isNullOrUndefined } from './index'

// 👉 Required Validator
export const requiredValidator = (value) => {
  if (isNullOrUndefined(value) || isEmptyArray(value) || value === false)
    return 'This field is required'

  return !!String(value).trim().length || 'This field is required'
}

// 👉 Email Validator
export const emailValidator = (value) => {
  if (isEmpty(value)) return true
  const re =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  if (Array.isArray(value))
    return value.every((val) => re.test(String(val))) || 'The Email field must be a valid email'

  return re.test(String(value)) || 'The Email field must be a valid email'
}

// 👉 Password Validator
export const passwordValidator = (password) => {
  const regExp = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%&*()]).{8,}/
  const validPassword = regExp.test(password)

  return (
     
    validPassword ||
    'Field must contain at least one uppercase, lowercase, special character and digit with min 8 chars'
  )
}

// 👉 Confirm Password Validator
export const confirmedValidator = (value, target) =>
  value === target || 'The Confirm Password field confirmation does not match'

// 👉 Between Validator
export const betweenValidator = (value, min, max) => {
  const valueAsNumber = Number(value)

  return (
    (Number(min) <= valueAsNumber && Number(max) >= valueAsNumber) ||
    `Enter number between ${min} and ${max}`
  )
}

// 👉 Integer Validator
export const integerValidator = (value) => {
  if (isEmpty(value)) return true
  if (Array.isArray(value))
    return value.every((val) => /^-?[0-9]+$/.test(String(val))) || 'This field must be an integer'

  return /^-?[0-9]+$/.test(String(value)) || 'This field must be an integer'
}

// 👉 Positive Integer Validator
export const positiveIntegerValidator = (value) => {
  if (isEmpty(value)) return true
  if (Array.isArray(value))
    return (
      value.every((val) => /^[1-9]+$/.test(String(val))) || 'This field must be an positive integer'
    )

  return /^[1-9]+$/.test(String(value)) || 'This field must be an positive integer'
}

// 👉 NumberDecimal Validator
export const numberDecimalValidator = (value) => {
  if (isEmpty(value)) return true
  if (Array.isArray(value))
    return value.every((val) => /^-?[0-9.]+$/.test(String(val))) || 'This field must be an integer'

  return /^-?[0-9.]+$/.test(String(value)) || 'This field must be an integer'
}

// 👉 Regex Validator
export const regexValidator = (value, regex) => {
  if (isEmpty(value)) return true
  let regeX = regex
  if (typeof regeX === 'string') regeX = new RegExp(regeX)
  if (Array.isArray(value)) return value.every((val) => regexValidator(val, regeX))

  return regeX.test(String(value)) || 'The Regex field format is invalid'
}

// 👉 Alpha Validator
export const alphaValidator = (value) => {
  if (isEmpty(value)) return true

  return /^[A-Z]*$/i.test(String(value)) || 'The Alpha field may only contain alphabetic characters'
}

// 👉 URL Validator
export const urlValidator = (value) => {
  if (isEmpty(value)) return true
  const re = /^(http[s]?:\/\/){0,1}(www\.){0,1}[a-zA-Z0-9.-]+\.[a-zA-Z]{2,5}[.]{0,1}/

  return re.test(String(value)) || 'URL is invalid'
}

// 👉 Length Validator
export const lengthValidator = (value, length) => {
  if (isEmpty(value)) return true

  return (
    String(value).length === length ||
    `The Min Character field must be at least ${length} characters`
  )
}

// 👉 Alpha-dash Validator
export const alphaDashValidator = (value) => {
  if (isEmpty(value)) return true
  const valueAsString = String(value)

  return /^[0-9A-Z_-]*$/i.test(valueAsString) || 'All Character are not valid'
}

// 👉 Between Dates Validator
export const greaterThanDatesValidator = (value, date, errorString) => {
  return (
    new Date(value) > new Date(date) ||
    (errorString ? errorString : 'The date must be greater than the start date')
  )
}

// 👉 Between two Dates Validator
export const betweenTwoDatesValidator = (value, date, errorString) => {
  const currentDate = new Date(Date.now())

  return (
    (new Date(currentDate) < new Date(value) && new Date(value) <= date) ||
    (errorString ? errorString : 'The date must be greater than the start date')
  )
}

// 👉 Is Between two DateTime Validator
export const isBetweenTwoDateTimeValidator = (value, startDateTime, endDateTime, errorString) => {
  const current = new Date(value)
  const start = new Date(startDateTime)
  const end = new Date(endDateTime)

  return (
    (current >= start && current <= end) ||
    (errorString ? errorString : 'The date must be between time')
  )
}

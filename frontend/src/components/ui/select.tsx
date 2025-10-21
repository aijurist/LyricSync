import * as React from "react"
import { ChevronDown } from "lucide-react"

interface SelectProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
}

interface SelectTriggerProps {
  className?: string
  children: React.ReactNode
}

interface SelectContentProps {
  children: React.ReactNode
}

interface SelectItemProps {
  value: string
  className?: string
  children: React.ReactNode
}

interface SelectValueProps {
  placeholder?: string
}

const SelectContext = React.createContext<{
  value: string
  onValueChange: (value: string) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}>({
  value: "",
  onValueChange: () => {},
  isOpen: false,
  setIsOpen: () => {},
})

const Select: React.FC<SelectProps> = ({ value, onValueChange, children }) => {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <SelectContext.Provider value={{ value, onValueChange, isOpen, setIsOpen }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

const SelectTrigger: React.FC<SelectTriggerProps> = ({ className, children }) => {
  const { isOpen, setIsOpen } = React.useContext(SelectContext)
  
  return (
    <button
      type="button"
      className={`flex h-8 w-full items-center justify-between rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${className}`}
      onClick={() => setIsOpen(!isOpen)}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  )
}

const SelectValue: React.FC<SelectValueProps> = ({ placeholder }) => {
  const { value } = React.useContext(SelectContext)
  
  return <span>{value || placeholder}</span>
}

const SelectContent: React.FC<SelectContentProps> = ({ children }) => {
  const { isOpen } = React.useContext(SelectContext)
  
  if (!isOpen) return null
  
  return (
    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-80 overflow-auto min-w-48">
      {children}
    </div>
  )
}

const SelectItem: React.FC<SelectItemProps> = ({ value, className, children }) => {
  const { onValueChange, setIsOpen } = React.useContext(SelectContext)
  
  return (
    <button
      type="button"
      className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-black dark:text-white transition-colors ${className}`}
      onClick={() => {
        onValueChange(value)
        setIsOpen(false)
      }}
    >
      {children}
    </button>
  )
}

export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
}

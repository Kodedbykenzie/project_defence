import React, { forwardRef, InputHTMLAttributes, ReactNode } from "react";
import { inputClass } from "../../utils/styles";
import { BoxIcon } from "lucide-react";
interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: BoxIcon;
  trailing?: ReactNode;
  invalid?: boolean;
}
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput({
  icon: Icon,
  trailing,
  invalid,
  className = '',
  ...props
}, ref) {
  return <div className="relative">
      {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden="true" />}
      <input ref={ref} aria-invalid={invalid || undefined} className={`${inputClass} h-11 md:h-10 ${Icon ? 'pl-9' : ''} ${trailing ? 'pr-11' : ''} ${invalid ? 'border-rose-300 hover:border-rose-300 focus:border-rose-400 focus:ring-rose-100' : ''} ${className}`} {...props} />
      {trailing && <div className="absolute inset-y-0 right-0 flex items-center pr-1">{trailing}</div>}
    </div>;
});
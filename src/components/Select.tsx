import { Children, isValidElement, type ComponentProps, type ReactNode } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Kept out of kit.tsx on purpose: kit loads on every page, and Radix Select with its positioning code
// would add about 20 KB to the main script. Only pages that load on demand import this file.

type NativeSelectProps = Omit<ComponentProps<typeof SelectTrigger>, "children" | "onChange" | "value" | "defaultValue"> & {
  children?: ReactNode;
  value?: string | number;
  defaultValue?: string | number;
  name?: string;
  required?: boolean;
  onChange?: (event: { target: { value: string } }) => void;
};

/** Shared accessible dropdown. Keeps native option children and form submission semantics at call sites. */
export function NativeSelect({ className, children, value, defaultValue, name, required, disabled, onChange, ...triggerProps }: NativeSelectProps) {
  const options = Children.toArray(children).flatMap((child, index) => {
    if (!isValidElement<{ value?: string | number; disabled?: boolean; children?: ReactNode }>(child) || child.type !== "option") return [];
    const optionValue = child.props.value ?? (typeof child.props.children === "string" ? child.props.children : String(index));
    return [{ key: child.key ?? optionValue, value: String(optionValue), disabled: child.props.disabled, label: child.props.children }];
  });
  const selectValue = value === undefined ? undefined : String(value);
  const initialValue = defaultValue === undefined ? options[0]?.value : String(defaultValue);

  return (
    <Select
      value={selectValue}
      defaultValue={initialValue}
      name={name}
      required={required}
      disabled={disabled}
      onValueChange={(next) => onChange?.({ target: { value: next } })}
    >
      <SelectTrigger className={cn("w-full", className)} {...triggerProps}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.key} value={option.value} disabled={option.disabled}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

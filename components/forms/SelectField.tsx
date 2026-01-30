import React from 'react'
import { Label } from "@/components/ui/label";
import { Controller } from "react-hook-form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

/**
 * 下拉选择表单项组件
 */
const SelectField = ({ name, label, placeholder, options, control, error, required = false }: SelectFieldProps) => {
    return (
        <div className="space-y-2">
            <Label htmlFor={name}>{label}</Label>

            <Controller
                name={name}
                control={control}
                rules={{
                    required: required ? `请选择${label}` : false,
                }}
                render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="select-trigger">
                            <SelectValue placeholder={placeholder} />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600 text-white">
                            {options.map((option) => (
                                <SelectItem key={option.value} value={option.value} className="focus:bg-gray-600 focus: text-white">
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                        {error && <p className="text-red-600">{error.message}</p>}
                    </Select>
                )}
            />
        </div>
    )
}
export default SelectField

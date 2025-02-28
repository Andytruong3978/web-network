import { Fragment, useEffect, useRef, useState } from "react";
import NumberFormat from "react-number-format";

import clsx from "clsx";
import { kebabCase } from "lodash";
import { useTranslation } from "next-i18next";

import InfoTooltip from "components/info-tooltip";

import { InputNumber as InputNumberProps } from "types/input-number";


export default function InputNumber({
  label = "",
  symbol = "",
  classSymbol = "text-primary",
  placeholder = "0",
  min = "0",
  helperText = "",
  className = "",
  error = false,
  success = false,
  warning = false,
  errorMessage,
  setMaxValue,
  description,
  allowNegative = false,
  fullWidth = false,
  value,
  onValueChange,
  ...params
}: InputNumberProps) {
  const { t } = useTranslation(["common"]);
  const [inputValue, setInputValue] = useState<number | string | null>()
  const debounce = useRef(null)
  
  const id = kebabCase(typeof label === 'string' ? label : "");
  const errorStyle = { "text-danger bg-opacity-100": error };
  const successStyle = { "text-success bg-opacity-100": success };
  const warningStyle = { "text-warning bg-opacity-100": warning };
  const shouldBeWrapped = label || helperText;
  const Component = shouldBeWrapped ? "div" : Fragment;

  function handleInputChange(e) {
    setInputValue(e?.target?.value || null)

    clearTimeout(debounce.current)
    
    debounce.current = setTimeout(() => {
      onValueChange?.(e)
    }, 500)
  }

  useEffect(()=>{if(value !== inputValue) setInputValue(value)},[value])

  return (
    <Component {...(shouldBeWrapped && { className: `form-group ${fullWidth ? 'w-100' : ''}` })}>
      {label && typeof label === 'string' ? (
        <label
          className="caption-small mb-2 text-gray d-flex align-items-center"
          id={id}
        >
          <span className="mr-1">{label}</span>{" "}
          {description ? <InfoTooltip description={description} /> : ""}
        </label>
      ): label}
      <div
        className={clsx("input-group border-radius-8", {
          ...errorStyle,
          ...successStyle,
          ...warningStyle
        })}
      >
        <NumberFormat
          className={clsx("form-control border-radius-8",
                          {
              "border border-1 border-success border-radius-8": success,
              "border border-1 border-danger border-radius-8": error,
              "border border-1 border-warning border-radius-8": warning,
              ...successStyle,
              ...warningStyle,
              ...errorStyle
                          },
                          className)}
          htmlFor={id}
          min={min}
          placeholder={placeholder}
          allowNegative={allowNegative}
          {...params}
          onValueChange={handleInputChange}
          value={inputValue}
        />
        {symbol && (
          <span
            className={clsx("input-group-text caption-small border-radius-8",
                            classSymbol,
                            {
                "border border-1 border-success border-radius-8": success,
                "border border-1 border-danger border-radius-8": error,
                "border border-1 border-warning border-radius-8": warning,
                "group-disabled": params?.disabled,
                ...errorStyle
                            })}
          >
            {symbol}
          </span>
        )}
        {setMaxValue && (
          <span
            className={clsx("input-group-text caption-medium border-radius-8",
                            classSymbol,
                            {
                "group-disabled": params?.disabled,
                "cursor-pointer": !params?.disabled,
                "border border-1 border-success": success,
                "border border-1 border-danger": error,
                "border border-1 border-warning": warning,
                ...errorStyle
                            })}
            onClick={setMaxValue}
          >
            {t("misc.max")}
          </span>
        )}
      </div>
      {helperText && (
        <div
          className={clsx("p-small text-gray my-2", {
            trans: !error,
            className,
            ...errorStyle
          })}
        >
          {helperText}
        </div>
      )}
      {error && errorMessage && (
        <p
          className={clsx("p-small text-gray my-2", {
            trans: !error,
            ...errorStyle
          })}
        >
          {error}
        </p>
      )}
    </Component>
  );
}

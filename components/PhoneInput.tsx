"use client";

import {
  ChangeEvent,
  ClipboardEvent,
  KeyboardEvent,
  useRef,
} from "react";
import { digitsOnly } from "@/lib/phone";

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  maxLength?: number;
};

export function PhoneInput({
  id,
  value,
  onChange,
  placeholder = "01012345678",
  autoComplete = "tel",
  required,
  maxLength = 20,
}: Props) {
  const composing = useRef(false);

  function commit(next: string) {
    onChange(digitsOnly(next).slice(0, maxLength));
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    if (composing.current) return;
    commit(e.target.value);
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    e.stopPropagation();
    const pasted = digitsOnly(e.clipboardData.getData("text"));
    const input = e.currentTarget;
    const start = input.selectionStart ?? value.length;
    const end = input.selectionEnd ?? value.length;
    commit(value.slice(0, start) + pasted + value.slice(end));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (
      e.ctrlKey ||
      e.metaKey ||
      e.altKey ||
      e.key === "Backspace" ||
      e.key === "Delete" ||
      e.key === "Tab" ||
      e.key === "Escape" ||
      e.key === "Enter" ||
      e.key.startsWith("Arrow") ||
      e.key === "Home" ||
      e.key === "End"
    ) {
      return;
    }
    if (e.key.length === 1 && !/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  }

  return (
    <input
      id={id}
      type="tel"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete={autoComplete}
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
      onPaste={handlePaste}
      onKeyDown={handleKeyDown}
      onCompositionStart={() => {
        composing.current = true;
      }}
      onCompositionEnd={(e) => {
        composing.current = false;
        commit(e.currentTarget.value);
      }}
      required={required}
      maxLength={maxLength}
    />
  );
}

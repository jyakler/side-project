"use client";

import { useId } from "react";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

import { isValidRadius, MAX_RADIUS, MIN_RADIUS } from "../model/destination";

type Props = {
  value: number;
  onChange: (radius: number) => void;
  disabled?: boolean;
};

export function RadiusField({ value, onChange, disabled }: Props) {
  const id = useId();
  const invalid = !isValidRadius(value);

  return (
    <Field data-invalid={invalid || undefined} data-disabled={disabled || undefined}>
      <FieldLabel htmlFor={id}>반경 (m)</FieldLabel>
      <div className="flex items-center gap-3">
        <Slider
          aria-label="반경 조절"
          min={MIN_RADIUS}
          max={MAX_RADIUS}
          step={50}
          value={Number.isFinite(value) ? Math.min(Math.max(value, MIN_RADIUS), MAX_RADIUS) : MIN_RADIUS}
          onValueChange={(next) => onChange(Array.isArray(next) ? next[0] : next)}
          disabled={disabled}
        />
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          className="w-24"
          min={MIN_RADIUS}
          max={MAX_RADIUS}
          step={50}
          value={Number.isFinite(value) ? value : ""}
          onChange={(event) => onChange(event.target.value === "" ? Number.NaN : Number(event.target.value))}
          aria-invalid={invalid || undefined}
          disabled={disabled}
        />
      </div>
      {invalid && (
        <FieldError>
          반경은 {MIN_RADIUS.toLocaleString()} m에서 {MAX_RADIUS.toLocaleString()} m 사이로 정해 주세요.
        </FieldError>
      )}
    </Field>
  );
}

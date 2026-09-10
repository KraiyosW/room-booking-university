"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingLabel: string;
};

export function SubmitButton({
  children,
  pendingLabel,
  className = "button",
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button className={className} disabled={disabled || pending} {...props}>
      {pending ? pendingLabel : children}
    </button>
  );
}

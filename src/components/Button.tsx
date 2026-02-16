type ButtonProps = {
  children: React.ReactNode;
  type?: "button" | "submit";
  onClick?: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
};

function Button({
  children,
  type = "button",
  onClick,
  variant = "primary",
  disabled = false,
}: ButtonProps) {
  const base =
    "px-4 py-2 rounded-md text-sm font-medium transition min-w-[110px]";

  const styles =
    variant === "primary"
      ? disabled
        ? "bg-gray-400 text-white cursor-not-allowed"
        : "bg-blue-600 text-white hover:bg-blue-700"
      : disabled
        ? "border border-gray-300 text-gray-400 cursor-not-allowed"
        : "border border-gray-300 text-gray-700 hover:bg-gray-100";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles}`}
    >
      {children}
    </button>
  );
}

export default Button;

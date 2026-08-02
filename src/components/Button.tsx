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
        ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed"
        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700";

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

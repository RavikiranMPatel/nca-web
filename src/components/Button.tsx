type ButtonProps = {
  children: React.ReactNode;
  type?: "button" | "submit";
};

function Button({ children, type = "button" }: ButtonProps) {
  return (
    <button
      type={type}
      className="bg-primary text-white px-4 py-2 rounded-md hover:bg-blue-800 transition"
    >
      {children}
    </button>
  );
}

export default Button;

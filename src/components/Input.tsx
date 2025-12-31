type InputProps = {
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

function Input({ label, type = "text", value, onChange }: InputProps) {
  return (
    <div className="mb-4">
      <label className="block mb-1 font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}

export default Input;

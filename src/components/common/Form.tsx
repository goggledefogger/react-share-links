// src/components/common/Form.tsx
import React, { useState } from 'react';

interface FormField {
  name: string;
  type: string;
  placeholder: string;
  required?: boolean;
  maxLength?: number;
}

interface FormProps {
  fields: FormField[];
  onSubmit: (formData: { [key: string]: string }) => void;
  submitButtonText: string;
  submitButtonClass?: string;
}

const Form: React.FC<FormProps> = ({
  fields,
  onSubmit,
  submitButtonText,
  submitButtonClass,
}) => {
  const [formData, setFormData] = useState<{ [key: string]: string }>({});

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      {fields.map((field) => (
        <input
          key={field.name}
          type={field.type}
          name={field.name}
          placeholder={field.placeholder}
          value={formData[field.name] || ''}
          onChange={handleInputChange}
          required={field.required}
          maxLength={field.maxLength}
          className="form-input"
        />
      ))}
      <button type="submit" className={submitButtonClass || 'btn btn-primary'}>
        {submitButtonText}
      </button>
    </form>
  );
};

export default Form;

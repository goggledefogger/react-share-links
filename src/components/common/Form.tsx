import React, { useState } from 'react';
import './Form.css';

interface FormField {
  name: string;
  type: string;
  placeholder: string;
  required?: boolean;
  maxLength?: number;
  defaultValue?: string;
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
  submitButtonClass = 'btn btn-primary',
}) => {
  const [formData, setFormData] = useState<{ [key: string]: string }>(() => {
    // Initialize form data with default values
    const initialData: { [key: string]: string } = {};
    fields.forEach((field) => {
      if (field.defaultValue) {
        initialData[field.name] = field.defaultValue;
      }
    });
    return initialData;
  });

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(formData);
    setFormData({}); // Reset form after submission
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      {fields.map((field) => (
        <div key={field.name} className="input-wrapper">
          <input
            type={field.type}
            name={field.name}
            placeholder={field.placeholder}
            value={formData[field.name] || ''}
            onChange={handleInputChange}
            required={field.required}
            maxLength={field.maxLength}
            className="input"
          />
        </div>
      ))}
      <button type="submit" className={`btn ${submitButtonClass}`}>
        {submitButtonText}
      </button>
    </form>
  );
};

export default Form;

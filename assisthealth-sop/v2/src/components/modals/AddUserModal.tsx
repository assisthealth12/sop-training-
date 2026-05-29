import React, { useState, useEffect } from 'react';
import type { User } from '../tables/UsersTable';
import { useToast } from '../ui/ToastConfirm';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (user: Partial<User>) => Promise<void>;
  title: string;
  initialData?: User | null;
}

const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose, onSubmit, title, initialData }) => {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('Active');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setEmail(initialData.email);
      setStatus(initialData.status || 'Active');
      if (initialData.deadline) {
        try {
          const date = initialData.deadline.toDate ? initialData.deadline.toDate() : new Date(initialData.deadline);
          setDeadline(date.toISOString().split('T')[0]);
        } catch { setDeadline(''); }
      } else {
        setDeadline('');
      }
    } else {
      setName(''); setEmail(''); setStatus('Active'); setDeadline('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: Partial<User> = { name, email, status };
      if (deadline) payload.deadline = new Date(deadline);
      await onSubmit(payload);
      onClose();
    } catch (error) {
      console.error(error);
      showToast('Error saving user', 'error');
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initialData ? 'Edit User' : title}</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Enter full name" />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} disabled={!!initialData} placeholder="Enter email" />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
            <div className="form-group">
              <label>Deadline Date</label>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                <i className="fas fa-check"></i> {loading ? 'Saving...' : 'Save User'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddUserModal;

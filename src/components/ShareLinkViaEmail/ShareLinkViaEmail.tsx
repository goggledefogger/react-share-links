import React, { useState } from 'react';
import { functions } from '../../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { useToast } from '../../contexts/ToastContext';
import './ShareLinkViaEmail.css';

interface ShareLinkViaEmailProps {
  linkId: string;
  onClose: () => void;
}

const ShareLinkViaEmail: React.FC<ShareLinkViaEmailProps> = ({ linkId, onClose }) => {
  const [email, setEmail] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSharing(true);

    try {
      const shareLinkViaEmail = httpsCallable(functions, 'shareLinkViaEmail');
      await shareLinkViaEmail({ linkId, recipientEmail: email });
      showToast({ message: 'Link shared successfully', type: 'success' });
      onClose();
    } catch (error) {
      console.error('Error sharing link:', error);
      showToast({ message: 'Failed to share link', type: 'error' });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="share-link-modal">
      <h2>Share Link via Email</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Recipient's email"
          required
        />
        <button type="submit" disabled={isSharing}>
          {isSharing ? 'Sharing...' : 'Share'}
        </button>
      </form>
      <button onClick={onClose} className="close-button">Close</button>
    </div>
  );
};

export default ShareLinkViaEmail;

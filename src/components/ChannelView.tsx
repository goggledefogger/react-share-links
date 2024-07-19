// src/components/ChannelView.tsx
import React, { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { useChannels } from '../hooks/useChannels';
import { Channel, Link } from '../types';
import { useToast } from '../contexts/ToastContext';
import Form from './common/Form';
import EmojiPicker from 'emoji-picker-react';
import './ChannelView.css';

const ChannelView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [links, setLinks] = useState<Link[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const { getChannel, getChannelLinks, addLink, deleteLink, addEmojiReaction } =
    useChannels();
  const { showToast } = useToast();

  useEffect(() => {
    const fetchChannelAndLinks = async () => {
      if (id) {
        const fetchedChannel = await getChannel(id);
        setChannel(fetchedChannel);
        const fetchedLinks = await getChannelLinks(id);
        setLinks(fetchedLinks);
      }
    };

    fetchChannelAndLinks();
  }, [id, getChannel, getChannelLinks]);

  const handleAddLink = async (formData: { [key: string]: string }) => {
    const { url } = formData;
    if (id && url.trim()) {
      try {
        const newLink = await addLink(id, url);
        setLinks((prevLinks) => {
          const updatedLinks = [newLink, ...prevLinks];
          return updatedLinks.filter(
            (link, index, self) =>
              index === self.findIndex((t) => t.id === link.id)
          );
        });
        showToast({ message: 'Link added successfully', type: 'success' });
      } catch (error) {
        console.error('Error adding link:', error);
        showToast({ message: 'Failed to add link', type: 'error' });
      }
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (await deleteLink(linkId)) {
      setLinks((prevLinks) => prevLinks.filter((link) => link.id !== linkId));
      showToast({ message: 'Link deleted successfully', type: 'success' });
    } else {
      showToast({ message: 'Failed to delete link', type: 'error' });
    }
  };

  const handleEmojiClick = async (linkId: string, emojiObject: any) => {
    try {
      await addEmojiReaction(linkId, emojiObject.emoji);
      setLinks((prevLinks) =>
        prevLinks.map((link) =>
          link.id === linkId
            ? {
                ...link,
                reactions: [...(link.reactions || []), emojiObject.emoji],
              }
            : link
        )
      );
      setShowEmojiPicker(null);
    } catch (error) {
      console.error('Error adding emoji reaction:', error);
      showToast({ message: 'Failed to add emoji reaction', type: 'error' });
    }
  };

  if (!channel) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="channel-view">
      <h2 className="channel-title">Channel: {channel.name}</h2>
      <RouterLink to="/" className="back-link">
        Back to Channels
      </RouterLink>
      <div className="add-link-form">
        <h3>Add New Link</h3>
        <Form
          fields={[
            {
              name: 'url',
              type: 'text',
              placeholder: 'Enter a URL',
              required: true,
            },
          ]}
          onSubmit={handleAddLink}
          submitButtonText="Add Link"
          submitButtonClass="btn btn-primary"
        />
      </div>
      <ul className="link-list">
        {links.map((link) => (
          <li key={link.id} className="link-item">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="link-url">
              {link.url}
            </a>
            <p className="link-info">
              Added by: {link.username} at{' '}
              {new Date(link.createdAt).toLocaleString()}
            </p>
            <div className="link-actions">
              <button
                onClick={() => setShowEmojiPicker(link.id)}
                className="btn btn-secondary">
                Add Reaction
              </button>
              <button
                onClick={() => handleDeleteLink(link.id)}
                className="btn btn-danger">
                Delete
              </button>
            </div>
            {showEmojiPicker === link.id && (
              <div className="emoji-picker-container">
                <EmojiPicker
                  onEmojiClick={(emojiObject) =>
                    handleEmojiClick(link.id, emojiObject)
                  }
                />
              </div>
            )}
            <div className="reactions">
              {link.reactions &&
                link.reactions.map((emoji, index) => (
                  <span key={index} className="reaction">
                    {emoji}
                  </span>
                ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChannelView;

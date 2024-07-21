import React, { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { useChannels } from '../../hooks/useChannels';
import { Channel, Link } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import Form from '../common/Form';
import EmojiPicker from 'emoji-picker-react';
import DropdownMenu from '../common/DropdownMenu';
import ConfirmDialog from '../common/ConfirmDialog';
import { formatRelativeTime } from '../../utils/dateUtils';
import { FaUser, FaClock, FaLink, FaEllipsisV } from 'react-icons/fa';
import './ChannelView.css';

const ChannelView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [links, setLinks] = useState<Link[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const { getChannel, getChannelLinks, addLink, deleteLink, addEmojiReaction } =
    useChannels();
  const { showToast } = useToast();
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    linkId: string | null;
  }>({
    isOpen: false,
    linkId: null,
  });

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
          // Check if the link already exists in the list
          const existingLinkIndex = prevLinks.findIndex(
            (link) => link.id === newLink.id
          );
          if (existingLinkIndex !== -1) {
            // If it exists, update it
            const updatedLinks = [...prevLinks];
            updatedLinks[existingLinkIndex] = newLink;
            return updatedLinks;
          } else {
            // If it doesn't exist, add it to the beginning of the list
            return [newLink, ...prevLinks];
          }
        });
        showToast({ message: 'Link added successfully', type: 'success' });
      } catch (error) {
        console.error('Error adding link:', error);
        showToast({
          message:
            error instanceof Error ? error.message : 'Failed to add link',
          type: 'error',
        });
      }
    }
  };

  const handleDeleteClick = (linkId: string) => {
    setDeleteConfirmation({ isOpen: true, linkId });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmation.linkId) {
      try {
        await deleteLink(deleteConfirmation.linkId);
        setLinks((prevLinks) =>
          prevLinks.filter((link) => link.id !== deleteConfirmation.linkId)
        );
        showToast({ message: 'Link deleted successfully', type: 'success' });
      } catch (error) {
        console.error('Error deleting link:', error);
        showToast({ message: 'Failed to delete link', type: 'error' });
      }
      setDeleteConfirmation({ isOpen: false, linkId: null });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmation({ isOpen: false, linkId: null });
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

  const handleLinkClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCardClick = (e: React.MouseEvent, url: string) => {
    // Check if the click target is not part of the dropdown menu
    if (!(e.target as HTMLElement).closest('.dropdown-menu')) {
      handleLinkClick(url);
    }
  };

  return (
    <div className="channel-view">
      <h2 className="channel-title">Channel: {channel?.name}</h2>
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
          <li
            key={link.id}
            className="link-card"
            onClick={(e) => handleCardClick(e, link.url)}>
            <div className="link-card-header">
              <span className="link-url">
                <FaLink className="icon" /> {link.url}
              </span>
              <div className="dropdown-wrapper">
                <DropdownMenu
                  toggleButton={
                    <button className="btn-icon" aria-label="More options">
                      <FaEllipsisV />
                    </button>
                  }
                  options={[
                    {
                      label: 'Add Reaction',
                      action: () => {
                        setShowEmojiPicker(link.id);
                      },
                    },
                    {
                      label: 'Delete',
                      action: () => {
                        handleDeleteClick(link.id);
                      },
                    },
                  ]}
                />
              </div>
            </div>
            <div className="link-card-content">
              <div className="link-meta">
                <span className="link-author">
                  <FaUser className="icon" /> {link.username}
                </span>
                <span className="link-date">
                  <FaClock className="icon" />{' '}
                  {formatRelativeTime(link.createdAt)}
                </span>
              </div>
              <div className="link-reactions">
                {link.reactions &&
                  link.reactions.map((emoji, index) => (
                    <span key={index} className="reaction">
                      {emoji}
                    </span>
                  ))}
              </div>
            </div>
            {showEmojiPicker === link.id && (
              <div
                className="emoji-picker-container"
                onClick={(e) => e.stopPropagation()}>
                <EmojiPicker
                  onEmojiClick={(emojiObject) =>
                    handleEmojiClick(link.id, emojiObject)
                  }
                />
              </div>
            )}
          </li>
        ))}
      </ul>
      <ConfirmDialog
        isOpen={deleteConfirmation.isOpen}
        message="Are you sure you want to delete this link?"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
};

export default ChannelView;

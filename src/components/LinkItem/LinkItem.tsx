import React, { useState, useRef, useEffect } from 'react';
import { Link, Reaction } from '../../types';
import { useAuthUser } from '../../hooks/useAuthUser';
import { FaUser, FaClock, FaLink, FaSmile, FaTrash } from 'react-icons/fa';
import { formatRelativeTime } from '../../utils/dateUtils';
import LoadingSpinner from '../common/LoadingSpinner';
import EmojiPicker from 'emoji-picker-react';
import './LinkItem.css';

interface LinkItemProps {
  link: Link;
  onDelete: (linkId: string) => void;
  onReact: (linkId: string, emoji: string) => void;
  onRemoveReaction: (linkId: string, emoji: string) => void;
}

const LinkItem: React.FC<LinkItemProps> = ({
  link,
  onDelete,
  onReact,
  onRemoveReaction,
}) => {
  const { user } = useAuthUser();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(!link.preview);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const linkCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (link.preview) {
      setIsPreviewLoading(false);
    }
  }, [link.preview]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!(e.target as HTMLElement).closest('.link-actions')) {
      window.open(link.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleEmojiClick = (emojiObject: { emoji: string }) => {
    onReact(link.id, emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  const handleEmojiButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();
    setShowEmojiPicker(!showEmojiPicker);
  };

  return (
    <div
      className={`link-card ${link.userId === user?.uid ? 'user-posted' : ''}`}
      onClick={handleCardClick}
      ref={linkCardRef}
      role="button"
      tabIndex={0}
      aria-label={`Link to ${link.url}`}
      onKeyPress={(e) =>
        e.key === 'Enter' &&
        handleCardClick(e as unknown as React.MouseEvent<HTMLDivElement>)
      }>
      <div className="link-card-header">
        <span className="link-url">
          <FaLink aria-hidden="true" /> {link.url}
        </span>
        <div className="link-actions">
          <div className="emoji-button-container">
            <button
              ref={emojiButtonRef}
              className="btn-icon"
              onClick={handleEmojiButtonClick}
              aria-label="Add Reaction"
              aria-expanded={showEmojiPicker}>
              <FaSmile aria-hidden="true" />
            </button>
            {showEmojiPicker && (
              <div
                ref={emojiPickerRef}
                className="emoji-picker-container"
                onClick={(e) => e.stopPropagation()}>
                <EmojiPicker onEmojiClick={handleEmojiClick} />
              </div>
            )}
          </div>
          {link.userId === user?.uid && (
            <button
              className="btn-icon"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(link.id);
              }}
              aria-label="Delete Link">
              <FaTrash aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      <div className="link-preview-container">
        {isPreviewLoading ? (
          <div className="link-preview-loading">
            <LoadingSpinner size="small" />
          </div>
        ) : link.preview ? (
          <div className="link-preview">
            {link.preview.image && (
              <img
                src={link.preview.image}
                alt={link.preview.title || 'Link preview'}
                className="link-thumbnail"
              />
            )}
            <div className="link-metadata">
              <h3 className="link-title">{link.preview.title}</h3>
              <p className="link-description">{link.preview.description}</p>
              {link.preview.favicon && (
                <img
                  src={link.preview.favicon}
                  alt="Favicon"
                  className="link-favicon"
                />
              )}
            </div>
          </div>
        ) : (
          <div className="link-preview-unavailable">Preview not available</div>
        )}
      </div>
      <div className="link-card-content">
        <div className="link-meta">
          <span className="link-author">
            <FaUser className="icon" /> {link.username}
          </span>
          <span className="link-date">
            <FaClock className="icon" /> {formatRelativeTime(link.createdAt)}
          </span>
        </div>
        <div className="link-reactions">
          {link.reactions &&
            link.reactions.map((reaction: Reaction, index: number) => (
              <span
                key={index}
                className="reaction"
                onClick={(e) => {
                  e.stopPropagation();
                  if (reaction.userId === user?.uid) {
                    onRemoveReaction(link.id, reaction.emoji);
                  }
                }}
                style={{
                  cursor: reaction.userId === user?.uid ? 'pointer' : 'default',
                }}>
                {reaction.emoji}
              </span>
            ))}
        </div>
      </div>
    </div>
  );
};

export default LinkItem;

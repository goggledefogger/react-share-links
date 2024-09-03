import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, Reaction } from '../../types';
import { useAuthUser } from '../../hooks/useAuthUser';
import { useChannels } from '../../hooks/useChannels';
import { FaUser, FaClock, FaLink, FaSmile, FaTrash, FaShare } from 'react-icons/fa';
import { formatRelativeTime } from '../../utils/dateUtils';
import LoadingSpinner from '../common/LoadingSpinner';
import EmojiPicker, { EmojiClickData, Theme, EmojiStyle } from 'emoji-picker-react';
import { useTheme } from '../../contexts/ThemeContext';
import './LinkItem.css';
import Tooltip from '../common/Tooltip'; // You'll need to create this component
import ShareLinkViaEmail from '../ShareLinkViaEmail/ShareLinkViaEmail';

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
  const { getUsernameById } = useChannels();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(!link.preview);
  const [username, setUsername] = useState<string | null>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const linkCardRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const emojiTheme: Theme = theme === 'dark' ? Theme.DARK : Theme.LIGHT;
  const emojiStyle: EmojiStyle = EmojiStyle.APPLE;
  const [activeEmojiPickerId, setActiveEmojiPickerId] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

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
        setActiveEmojiPickerId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchUsername = async () => {
      const fetchedUsername = await getUsernameById(link.userId);
      setUsername(fetchedUsername);
    };
    fetchUsername();
  }, [link.userId, getUsernameById]);

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (
      !target.closest('.link-actions') &&
      !target.closest('.link-reactions') &&
      !target.closest('.share-link-modal')
    ) {
      window.open(link.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleShareClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setIsShareModalOpen(true);
  };

  const handleEmojiClick = (emojiData: EmojiClickData, event: MouseEvent) => {
    onReact(link.id, emojiData.emoji);
    setActiveEmojiPickerId(null);
  };

  const handleEmojiButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();
    setActiveEmojiPickerId(prevId => prevId === link.id ? null : link.id);
  };

  const renderReaction = useCallback(async (reaction: Reaction, index: number) => {
    const isCurrentUserReaction = reaction.userId === user?.uid;

    let tooltipContent = '';
    if (isCurrentUserReaction) {
      tooltipContent = 'You';
    } else {
      const username = await getUsernameById(reaction.userId);
      tooltipContent = username || 'Unknown user';
    }

    if (reaction.userIds && reaction.userIds.length > 1) {
      const otherUsernames = await Promise.all(
        reaction.userIds
          .filter(id => id !== reaction.userId)
          .map(getUsernameById)
      );
      const validUsernames = otherUsernames.filter(name => name);
      if (validUsernames.length > 0) {
        tooltipContent += ` and ${validUsernames.length} other${validUsernames.length > 1 ? 's' : ''}`;
      }
    }

    return (
      <Tooltip key={index} content={tooltipContent}>
        <span
          className={`reaction ${isCurrentUserReaction ? 'current-user-reaction' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (isCurrentUserReaction) {
              onRemoveReaction(link.id, reaction.emoji);
            }
          }}
          style={{
            cursor: isCurrentUserReaction ? 'pointer' : 'default',
          }}
        >
          {reaction.emoji}
        </span>
      </Tooltip>
    );
  }, [user?.uid, getUsernameById, onRemoveReaction, link.id]);

  // Use React.memo to optimize rendering of reactions
  const MemoizedReaction = React.memo(({ reaction, index }: { reaction: Reaction, index: number }) => {
    const [renderedReaction, setRenderedReaction] = useState<React.ReactElement | null>(null);

    useEffect(() => {
      renderReaction(reaction, index).then(setRenderedReaction);
    }, [reaction, index]);

    return renderedReaction;
  });

  return (
    <div
      className={`link-card ${link.userId === user?.uid ? 'user-created' : ''} ${activeEmojiPickerId === link.id ? 'emoji-picker-open' : ''}`}
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
        <div className="link-url-container">
          {link.preview?.favicon && <img src={link.preview.favicon} alt="Favicon" className="link-favicon" />}
          <a href={link.url} className="link-url" target="_blank" rel="noopener noreferrer">
            {link.url}
          </a>
        </div>
        <div className="link-actions">
          <button onClick={handleShareClick} className="share-button">
            <FaShare />
          </button>
          <div className="emoji-button-container">
            <button
              ref={emojiButtonRef}
              className="btn-icon"
              onClick={handleEmojiButtonClick}
              aria-label="Add Reaction"
              aria-expanded={activeEmojiPickerId === link.id}>
              <FaSmile aria-hidden="true" />
            </button>
            {activeEmojiPickerId === link.id && (
              <div
                ref={emojiPickerRef}
                className="emoji-picker-container"
                onClick={(e) => e.stopPropagation()}>
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  theme={emojiTheme}
                  emojiStyle={emojiStyle}
                  autoFocusSearch={false}
                  lazyLoadEmojis={true}
                  searchPlaceholder="Search emojis..."
                  skinTonesDisabled
                  width={300}
                  height={400}
                />
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
            <div className="link-metadata">
              <h3 className="link-title">{link.preview.title}</h3>
              <p className="link-description">{link.preview.description}</p>
            </div>
            {link.preview.image && (
              <img
                src={link.preview.image}
                alt={link.preview.title || 'Link preview'}
                className="link-thumbnail"
              />
            )}
          </div>
        ) : (
          <div className="link-preview-unavailable">Preview not available</div>
        )}
      </div>
      <div className="link-card-content">
        <div className="link-meta">
          <span className={`link-author ${link.userId === user?.uid ? 'current-user' : ''}`}>
            <FaUser className="icon" /> {username || 'Loading...'}
          </span>
          <span className={`link-date ${link.userId === user?.uid ? 'current-user' : ''}`}>
            <FaClock className="icon" /> {formatRelativeTime(link.createdAt)}
          </span>
        </div>
        <div className="link-reactions">
          {link.reactions && link.reactions.map((reaction, index) => (
            <MemoizedReaction key={`${reaction.emoji}-${index}`} reaction={reaction} index={index} />
          ))}
        </div>
      </div>
      {isShareModalOpen && (
        <div onClick={(e) => e.stopPropagation()}>
          <ShareLinkViaEmail
            linkId={link.id}
            onClose={() => setIsShareModalOpen(false)}
          />
        </div>
      )}
    </div>
  );
};

export default React.memo(LinkItem);

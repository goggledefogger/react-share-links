"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isYoutubeUrl = exports.getYoutubeVideoId = void 0;
function getYoutubeVideoId(url) {
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i; //eslint-disable-line
    const match = url.match(youtubeRegex);
    return match ? match[1] : null;
}
exports.getYoutubeVideoId = getYoutubeVideoId;
function isYoutubeUrl(url) {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/i;
    return youtubeRegex.test(url);
}
exports.isYoutubeUrl = isYoutubeUrl;
//# sourceMappingURL=youtubeUtils.js.map
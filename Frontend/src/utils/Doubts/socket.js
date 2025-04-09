import { io } from "socket.io-client";

const SOCKET_URL = "https://campus-connect-1-7rgs.onrender.com/";

export const socket = io(SOCKET_URL);

// Question related events
export const subscribeToQuestions = (callback) => {
  socket.on("question_added", callback);
};

export const loadMoreQuestions = (page, limit) => {
  socket.emit("load_more_questions", { page, limit });
};

export const subscribeToQuestionsPage = (callback) => {
  socket.on("questions_page_request", callback);
};

// Answer related events
export const joinQuestionRoom = (questionId) => {
  socket.emit("join_question", questionId);
};

export const leaveQuestionRoom = (questionId) => {
  socket.emit("leave_question", questionId);
};

export const subscribeToAnswers = (callback) => {
  socket.on("answer_added", callback);
};

export const loadMoreAnswers = (questionId, cursor, limit) => {
  socket.emit("load_more_answers", { questionId, cursor, limit });
};

export const subscribeToAnswersPage = (callback) => {
  socket.on("answers_page_request", callback);
};

export const subscribeToLoadedAnswers = (callback) => {
  socket.on("answers_loaded", callback);
};

// Reply related events
export const subscribeToReplies = (callback) => {
  socket.on("reply_added", callback);
};

export const emitNewReply = (answerId, reply) => {
  socket.emit("new_reply", { answerId, reply });
};

export const loadMoreReplies = (answerId, cursor, limit) => {
  socket.emit("load_more_replies", { answerId, cursor, limit });
};

export const subscribeToRepliesPage = (callback) => {
  socket.on("replies_page_request", callback);
};

// Existing emit methods
export const emitNewQuestion = (question) => {
  socket.emit("new_question", question);
};

export const emitNewAnswer = (answer) => {
  socket.emit("new_answer", answer);
};

// Cleanup method
export const cleanup = () => {
  socket.off("question_added");
  socket.off("answer_added");
  socket.off("reply_added");
  socket.off("questions_page_request");
  socket.off("answers_page_request");
  socket.off("replies_page_request");
  socket.off("answers_loaded");
};

import { useEffect, useState, useCallback, Fragment } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom"; // Import useLocation
import { toast } from "react-toastify";
import {
  FaArrowAltCircleUp,
  FaArrowAltCircleDown,
  FaReply,
} from "react-icons/fa";
import {
  fetchAnswersByIds,
  submitAnswer,
  fetchReplies,
  upvoteAnswer,
  downvoteAnswer,
} from "../../utils/Doubts/doubtService";
import {
  subscribeToAnswers,
  subscribeToReplies,
  emitNewAnswer,
  emitNewReply,
  subscribeToLoadedAnswers,
  cleanup,
} from "../../utils/Doubts/socket";
import { Dialog, Transition } from "@headlessui/react";

export const AnswerDialog = ({
  isOpen,
  onClose,
  onSubmit,
  answerText,
  setAnswerText,
  isReply,
}) => {
  const handleAnswerSubmit = () => {
    if (!answerText.trim()) {
      toast.error("Answer cannot be empty!");
      return;
    }
    onSubmit(answerText);
    onClose();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900 bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-semibold leading-6 text-gray-900"
                >
                  {isReply ? "Reply to Answer" : "Answer Question"}
                </Dialog.Title>
                <div className="mt-4">
                  <textarea
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring focus:ring-blue-200"
                    rows="5"
                    placeholder={
                      isReply
                        ? "Type your reply here..."
                        : "Type your answer here..."
                    }
                  />
                </div>
                <div className="mt-6">
                  <button
                    onClick={handleAnswerSubmit}
                    className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600"
                  >
                    Submit {isReply ? "Reply" : "Answer"}
                  </button>
                  <button
                    onClick={onClose}
                    className="w-full bg-gray-300 text-gray-700 py-2 rounded-lg mt-3 hover:bg-gray-400"
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

const AnswerComponent = ({ answer, onReply, onVote }) => {
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState([]);
  const [replyPage, setReplyPage] = useState(1);
  const [hasMoreReplies, setHasMoreReplies] = useState(true);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);

  const loadReplies = async () => {
    try {
      setIsLoadingReplies(true);
      const response = await fetchReplies(answer._id, null, 5);

      if (Array.isArray(response.replies)) {
        setReplies(response.replies);
        setHasMoreReplies(response.hasMore);
      }
    } catch (error) {
      console.error("Error loading replies:", error);
      toast.error("Failed to load replies");
    } finally {
      setIsLoadingReplies(false);
    }
  };

  const loadMoreReplies = async () => {
    const lastReply = replies[replies.length - 1];
    const response = await fetchReplies(answer._id, lastReply._id, 5);
    setReplies([...replies, ...response.replies]);
    setHasMoreReplies(response.hasMore);
    setReplyPage((prev) => prev + 1);
  };

  return (
    <div className="bg-[#31363F] p-4 rounded-lg mb-4">
      <p className="mb-4">{answer.content}</p>
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-6">
          <div className="flex gap-2">
            <button
              onClick={() => onVote(answer._id, "upvote")}
              className="flex items-center space-x-1 text-gray-400 hover:text-blue-500"
            >
              <FaArrowAltCircleUp size={20} />
              <span>{answer.upvotes}</span>
            </button>
            <button
              onClick={() => onVote(answer._id, "downvote")}
              className="flex items-center space-x-1 text-gray-400 hover:text-red-500"
            >
              <FaArrowAltCircleDown size={20} />
              <span>{answer.downvotes}</span>
            </button>
          </div>
          <button
            onClick={() => onReply(answer._id)}
            className="flex items-center space-x-1 text-blue-400 hover:text-blue-300"
          >
            <FaReply size={16} />
            <span>Reply</span>
          </button>
          <button
            onClick={() => {
              if (!showReplies) loadReplies();
              setShowReplies(!showReplies);
            }}
            className="flex items-center space-x-1 text-blue-400 hover:text-blue-300"
          >
            <span>{showReplies ? "Hide replies" : "Show replies"}</span>
          </button>
        </div>
        <span className="text-sm text-gray-400">
          by {answer.createdBy?.username}
        </span>
      </div>
      {showReplies && (
        <div className="ml-8 mt-4 space-y-4">
          {isLoadingReplies ? (
            <div>Loading replies...</div>
          ) : replies && replies.length > 0 ? (
            <>
              {replies.map((reply) => (
                <div key={reply._id} className="bg-[#404650] p-3 rounded">
                  <p>{reply.content}</p>
                  <div className="flex justify-end">
                    <span className="text-sm text-gray-400">
                      by {reply.createdBy?.username || "Anonymous"}
                    </span>
                  </div>
                </div>
              ))}
              {hasMoreReplies && (
                <button
                  onClick={loadMoreReplies}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  Load more replies...
                </button>
              )}
            </>
          ) : (
            <div>No replies yet</div>
          )}
        </div>
      )}
    </div>
  );
};

const QuestionDetail = () => {
  const { questionId } = useParams();
  const location = useLocation(); // Use useLocation to get the passed state
  const [question, setQuestion] = useState(location.state?.question || null);
  const [answers, setAnswers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isAnswering, setIsAnswering] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [answerText, setAnswerText] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const loadAnswers = async () => {
      try {
        setIsLoading(true);
        const response = await fetchAnswersByIds(questionId);

        if (Array.isArray(response.answers)) {
          setAnswers(response.answers);
          setHasMore(response.hasMore || false);
        }
      } catch (error) {
        console.error("Error loading answers:", error);
        toast.error("Failed to load answers");
        setAnswers([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadAnswers();

    // Socket event handlers
    const handleNewAnswer = (newAnswer) => {
      if (newAnswer.question === questionId) {
        setAnswers((prev) => [...prev, newAnswer]);
      }
    };

    const handleLoadedAnswers = (loadedAnswers) => {
      if (loadedAnswers.question === questionId) {
        setAnswers(loadedAnswers.answers);
      }
    };

    // Subscribe to socket events
    subscribeToAnswers(handleNewAnswer);
    subscribeToLoadedAnswers(handleLoadedAnswers);
    subscribeToReplies((data) => {
      if (data.reply.question === questionId) {
        setAnswers((prev) =>
          prev.map((answer) =>
            answer._id === data.answerId
              ? {
                  ...answer,
                  replies: [...(answer.replies || []), data.reply],
                }
              : answer
          )
        );
      }
    });

    return () => {
      // Cleanup socket subscriptions
      cleanup();
    };
  }, [questionId]);

  const loadMoreAnswers = async () => {
    const lastAnswer = answers[answers.length - 1];
    const response = await fetchAnswersByIds(questionId, lastAnswer._id, 10);
    setAnswers([...answers, ...response.answers]);
    setHasMore(response.hasMore);
    setPage((prev) => prev + 1);
  };

  const handleSubmitAnswer = async (content) => {
    try {
      const answer = await submitAnswer(questionId, { content }, replyTo);
      if (replyTo) {
        emitNewReply(replyTo, answer);
      } else {
        emitNewAnswer(answer);
      }
      setIsAnswering(false);
      setReplyTo(null);
      setAnswerText("");
      toast.success("Answer submitted successfully!");
    } catch (error) {
      toast.error("Failed to submit answer");
    }
  };

  const handleVote = async (answerId, voteType) => {
    try {
      const response = await (voteType === "upvote"
        ? upvoteAnswer(answerId)
        : downvoteAnswer(answerId));
      setAnswers((prev) =>
        prev.map((a) => (a._id === answerId ? { ...a, ...response } : a))
      );
    } catch (error) {
      toast.error(`Failed to ${voteType}`);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-6 bg-gradient-to-b bg-gray-950 min-h-screen text-[#E0EFFF]">
      {question && (
        <div className="mb-8 p-6 rounded-lg bg-gray-900 shadow-lg">
          <div className="flex justify-between">
            <h1 className="text-3xl font-bold mb-4 text-[#64FFDA]">
              {question.title}
            </h1>
            <span className="text-gray-400">
              {new Date(question.createdAt).toLocaleDateString()}
            </span>
          </div>
          <p className="mb-4">{question.description}</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {question.tags.map((tag) => (
              <span
                key={tag}
                className="bg-[#233554] text-[#64FFDA] px-3 py-1 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="flex justify-between items-center text-sm text-gray-400">
            <span>Category: {question.category}</span>
            <span>Asked by: {question.createdBy?.username}</span>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {answers.map((answer) => (
          <AnswerComponent
            key={answer._id}
            answer={answer}
            onReply={(answerId) => {
              setReplyTo(answerId);
              setIsAnswering(true);
            }}
            onVote={handleVote}
          />
        ))}

        {hasMore && (
          <button
            onClick={loadMoreAnswers}
            className="w-full bg-[#1C2A3A] text-[#64FFDA] py-3 rounded-lg hover:bg-[#233554] shadow-md"
          >
            Load more answers
          </button>
        )}
      </div>

      <button
        onClick={() => {
          setReplyTo(null);
          setIsAnswering(true);
        }}
        className="fixed bottom-6 right-6 p-4 bg-[#64FFDA] text-[#0A192F] rounded-full shadow-lg hover:bg-[#52E0C4]"
      >
        Answer
      </button>

      <AnswerDialog
        isOpen={isAnswering}
        onClose={() => {
          setIsAnswering(false);
          setReplyTo(null);
        }}
        onSubmit={handleSubmitAnswer}
        answerText={answerText}
        setAnswerText={setAnswerText}
        isReply={!!replyTo}
      />
    </div>
  );
};

export default QuestionDetail;

import { useEffect, useState, useCallback, Fragment } from "react";
import PropTypes from "prop-types";
import { toast } from "react-toastify";
import { Dialog, Transition } from "@headlessui/react";
import { FaArrowAltCircleUp, FaArrowAltCircleDown } from "react-icons/fa";
import { IoTrashBinSharp } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import {
  fetchQuestions,
  submitQuestion,
  submitAnswer,
  upvoteAnswer,
  downvoteAnswer,
  fetchAnswersByIds,
  deleteQuestionAndAnswers,
  upvoteQuestion,
  downvoteQuestion,
} from "../../utils/Doubts/doubtService";
import {
  socket,
  subscribeToQuestions,
  subscribeToAnswers,
  emitNewQuestion,
  emitNewAnswer,
} from "../../utils/Doubts/socket";
import PaginationSlider from "../../components/PaginationSlider";
import { AnswerDialog } from "./QuestionDetail";
const CATEGORIES = [
  "Problem Discussions",
  "Interview Experiences",
  "General Discussions",
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "most_upvotes", label: "Most Upvotes" },
];

const QuestionDialog = ({ isOpen, onClose, onSubmit }) => {
  const [questionData, setQuestionData] = useState({
    title: "",
    description: "",
    category: CATEGORIES[0],
    tags: [],
  });
  const [tagInput, setTagInput] = useState("");

  const handleAddTag = () => {
    if (tagInput.trim() && !questionData.tags.includes(tagInput.trim())) {
      setQuestionData((prev) => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim().toUpperCase()],
      }));
      setTagInput("");
    }
  };

  const handleSubmit = () => {
    if (!questionData.title || !questionData.description) {
      toast.error("Title and description are required!");
      return;
    }
    onSubmit(questionData);
    onClose();
    setQuestionData({
      title: "",
      description: "",
      category: CATEGORIES[0],
      tags: [],
    });
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
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-lg bg-white p-6 shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900"
                >
                  Ask a Doubt
                </Dialog.Title>
                <div className="mt-4">
                  <input
                    value={questionData.title}
                    onChange={(e) =>
                      setQuestionData((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    className="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:ring focus:ring-blue-200"
                    placeholder="Question Title"
                  />
                  <textarea
                    value={questionData.description}
                    onChange={(e) =>
                      setQuestionData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    className="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:ring focus:ring-blue-200"
                    rows="4"
                    placeholder="Question Description"
                  />
                  <select
                    value={questionData.category}
                    onChange={(e) =>
                      setQuestionData((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                    className="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:ring focus:ring-blue-200"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center mb-4">
                    <input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
                      className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring focus:ring-blue-200"
                      placeholder="Add tags"
                    />
                    <button
                      onClick={handleAddTag}
                      className="ml-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {questionData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center"
                      >
                        {tag}
                        <button
                          onClick={() =>
                            setQuestionData((prev) => ({
                              ...prev,
                              tags: prev.tags.filter((t) => t !== tag),
                            }))
                          }
                          className="ml-2 text-red-500 hover:text-red-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="mt-6">
                    <button
                      onClick={handleSubmit}
                      className="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600"
                    >
                      Submit Question
                    </button>
                    <button
                      onClick={onClose}
                      className="w-full bg-gray-300 text-gray-700 py-3 rounded-lg mt-3 hover:bg-gray-400"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

QuestionDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired, // Must be a boolean value (true/false)
  onClose: PropTypes.func.isRequired, // Must be a function
  onSubmit: PropTypes.func.isRequired, // Must be a function
};

const DoubtsPage = () => {
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAnswerDialogOpen, setIsAnswerDialogOpen] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortOption, setSortOption] = useState(SORT_OPTIONS[0].value);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const [totalPages, setTotalPages] = useState(1);

  const navigate = useNavigate();

  const loadQuestions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetchQuestions(
        page,
        10,
        sortOption,
        selectedCategory,
        tagSearch.trim().toUpperCase()
      );

      setQuestions(response.questions);
      setHasMore(response.hasMore);
      setTotalPages(response.totalPages);
    } catch (error) {
      if (error.response?.status !== 404) {
        setError("Failed to load questions. Please try again later.");
        toast.error("Failed to load questions");
      } else {
        setQuestions([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [page, sortOption, selectedCategory, tagSearch]);

  useEffect(() => {
    const controller = new AbortController();
    loadQuestions();

    subscribeToQuestions((newQuestion) => {
      if (newQuestion.createdBy?._id !== socket.id) {
        setQuestions((prev) => [newQuestion, ...prev]);
      }
    });

    subscribeToAnswers((newAnswer) => {
      setQuestions((prev) =>
        prev.map((q) => {
          if (q._id === newAnswer.question) {
            const updatedAnswers = [...(q.answers || [])];
            const existingAnswerIndex = updatedAnswers.findIndex(
              (a) => a._id === newAnswer._id
            );

            if (existingAnswerIndex >= 0) {
              updatedAnswers[existingAnswerIndex] = newAnswer;
            } else {
              updatedAnswers.push(newAnswer);
            }

            return { ...q, answers: updatedAnswers };
          }
          return q;
        })
      );
    });

    return () => {
      controller.abort();
      socket.off("question_added");
      socket.off("answer_added");
    };
  }, [loadQuestions]);

  const toggleDialog = () => {
    setIsDialogOpen(!isDialogOpen);
  };

  const toggleAnswerDialog = (question) => {
    setSelectedQuestion(question);
    setIsAnswerDialogOpen(!isAnswerDialogOpen);
  };

  const handleQuestionSubmit = async (questionData) => {
    try {
      setIsLoading(true);
      const createdQuestion = await submitQuestion(questionData);
      emitNewQuestion(createdQuestion); // Emit socket event
      toast.success("Question submitted successfully!");
      // No need to call loadQuestions here as socket will handle the update
    } catch (error) {
      toast.error("Failed to submit question");
      console.error("Error submitting question:", error);
    } finally {
      setIsLoading(false);
      setIsDialogOpen(false);
    }
  };

  const handleAnswerSubmit = async () => {
    if (!answerText.trim()) {
      toast.error("Answer cannot be empty!");
      return;
    }

    try {
      setIsLoading(true);
      const answer = {
        content: answerText,
        questionId: selectedQuestion._id,
      };
      const createdAnswer = await submitAnswer(answer.questionId, answer);
      emitNewAnswer({ ...createdAnswer, question: answer.questionId });
      setAnswerText("");
      // No need to call loadQuestions here as socket will handle the update
    } catch (error) {
      toast.error("Failed to submit answer");
      console.error("Error submitting answer:", error);
    } finally {
      setIsLoading(false);
      setIsAnswerDialogOpen(false);
    }
  };

  const handleUpvote = async (questionId) => {
    try {
      const updatedQuestion = await upvoteQuestion(questionId);

      setQuestions((prevQuestions) =>
        prevQuestions.map((q) =>
          q._id === questionId
            ? {
                ...q,
                upvotes: updatedQuestion.upvotes,
              }
            : q
        )
      );
    } catch (error) {
      toast.error("Failed to upvote question");
      console.error("Error upvoting question:", error);
    }
  };

  const handleDownvote = async (questionId) => {
    try {
      const updatedQuestion = await downvoteQuestion(questionId);

      setQuestions((prevQuestions) =>
        prevQuestions.map((q) =>
          q._id === questionId
            ? {
                ...q,
                downvotes: updatedQuestion.downvotes,
              }
            : q
        )
      );
    } catch (error) {
      toast.error("Failed to downvote question");
      console.error("Error downvoting question:", error);
    }
  };

  const handleResolveQuestion = async (questionId) => {
    try {
      await deleteQuestionAndAnswers(questionId);
      setQuestions((prevQuestions) =>
        prevQuestions.filter((q) => q._id !== questionId)
      );
    } catch (error) {
      toast.error("Failed to resolve question");
      console.error("Error resolving question:", error);
    }
  };

  const handleQuestionClick = (question) => {
    navigate(`/questions/${question._id}`, { state: { question } });
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo(0, 0);
  };

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        <p>{error}</p>
        <button
          onClick={loadQuestions}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 min-h-screen bg-gray-950 flex flex-col text-[#E0EFFF]">
      {isLoading && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-900  bg-opacity-50 z-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#64FFDA]"></div>
        </div>
      )}

      <h2 className="text-3xl font-semibold self-center mb-6">Discussions</h2>
      <div className="flex justify-between mb-4">
        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="p-2 border rounded-md bg-gray-900 text-[#E0EFFF]"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="p-2 border rounded-md ml-2 bg-gray-900 text-[#E0EFFF]"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <input
            value={tagSearch}
            onChange={(e) => setTagSearch(e.target.value)}
            className="p-2 border rounded-md bg-gray-900 text-[#E0EFFF]"
            placeholder="Search by tag"
          />
        </div>
      </div>
      {questions.length === 0 && !isLoading && !error ? (
        <div className="text-center">
          <p className="text-gray-400 mb-4">
            No questions yet. Be the first to ask!
          </p>
          <button
            className="bg-[#64FFDA] text-[#0A192F] py-2 px-4 rounded-lg hover:bg-[#52E0C4]"
            onClick={toggleDialog}
          >
            Ask a Question
          </button>
        </div>
      ) : (
        <div
          className="space-y-4 flex-grow overflow-auto"
          style={{ maxHeight: "calc(100vh - 120px)" }}
        >
          {questions.map((question) => (
            <div
              key={question._id}
              className=" bg-gray-900 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleQuestionClick(question)}
            >
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center space-x-3">
                  <img
                    src={question.createdBy?.avatar || "/default-avatar.png"}
                    alt="User Avatar"
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="text-sm text-gray-400">
                    {question.createdBy?.username || "Anonymous"}
                  </span>
                </div>
                <span className="text-sm text-gray-400">
                  {new Date(question.createdAt).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2">{question.title}</h3>
                <p className="text-gray-300 mb-3">{question.description}</p>

                <div className="flex flex-wrap gap-2 mb-2">
                  {question.tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-[#233554] text-[#64FFDA] px-2 py-1 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <span className="text-sm text-gray-400">
                  Category: {question.category}
                </span>
              </div>

              <div className="flex justify-between items-center mt-4">
                <div className="flex space-x-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpvote(question._id);
                    }}
                    className="text-gray-400 hover:text-[#64FFDA] transition-colors flex items-center"
                  >
                    <FaArrowAltCircleUp size={24} />
                    <span className="ml-1">{question.upvotes || 0}</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownvote(question._id);
                    }}
                    className="text-gray-400 hover:text-[#FF6B6B] transition-colors flex items-center"
                  >
                    <FaArrowAltCircleDown size={24} />
                    <span className="ml-1">{question.downvotes || 0}</span>
                  </button>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResolveQuestion(question._id);
                  }}
                  className="px-4 py-2 bg-[#64FFDA] text-[#0A192F] rounded-lg hover:bg-[#52E0C4] flex items-center"
                >
                  <IoTrashBinSharp className="text-[20px]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <footer className="fixed -bottom-0 left-0 right-0 p-4 flex justify-center">
        <PaginationSlider
          currentPage={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </footer>
      <button
        className="fixed bottom-4 right-4 p-4 bg-[#64FFDA] text-[#0A192F] rounded-full shadow-lg hover:bg-[#52E0C4] focus:outline-none"
        onClick={toggleDialog}
      >
        Ask a Question
      </button>

      <QuestionDialog
        isOpen={isDialogOpen}
        onClose={toggleDialog}
        onSubmit={handleQuestionSubmit}
      />

      <AnswerDialog
        isOpen={isAnswerDialogOpen}
        onClose={() => setIsAnswerDialogOpen(false)}
        onSubmit={handleAnswerSubmit}
        answerText={answerText}
        setAnswerText={setAnswerText}
      />
    </div>
  );
};

export default DoubtsPage;

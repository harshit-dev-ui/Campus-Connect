import User from "../models/user.model.js";
import Answer from "../models/answer.model.js";
import Question from "../models/question.model.js";

export const addAnswer = async (req, res) => {
  try {
    const { content } = req.body;
    const { questionId, parentId } = req.params;

    const answer = await Answer.create({
      content,
      createdBy: req.user._id,
      question: questionId,
      parent: parentId || null,
    });

    await Question.findByIdAndUpdate(questionId, {
      $push: { answers: answer._id },
    });

    // await User.findByIdAndUpdate(req.user._id, {
    //   $inc: { auraPoints: 5 },
    // });

    return res.status(201).json(answer);
  } catch (error) {
    return res.status(500).json({ message: "Failed to add answer", error });
  }
};

export const upvoteAnswer = async (req, res) => {
  try {
    const { answerId } = req.params;

    const answer = await Answer.findById(answerId);

    if (answer.upvoters.includes(req.user._id)) {
      return res
        .status(400)
        .json({ message: "You have already upvoted this answer." });
    }

    if (answer.downvoters.includes(req.user._id)) {
      return res
        .status(400)
        .json({ message: "You have already downvoted this answer." });
    }

    answer.upvotes += 1;
    answer.upvoters.push(req.user._id);

    await User.findByIdAndUpdate(answer.createdBy, {
      $inc: { auraPoints: 10 },
    });

    await answer.save();

    return res.status(200).json(answer);
  } catch (error) {
    return res.status(500).json({ message: "Failed to upvote answer" });
  }
};

export const downvoteAnswer = async (req, res) => {
  try {
    const { answerId } = req.params;

    const answer = await Answer.findById(answerId);

    if (answer.downvoters.includes(req.user._id)) {
      return res
        .status(400)
        .json({ message: "You have already downvoted this answer." });
    }

    if (answer.upvoters.includes(req.user._id)) {
      return res
        .status(400)
        .json({ message: "You have already upvoted this answer." });
    }

    answer.downvotes += 1;
    answer.downvoters.push(req.user._id);

    await answer.save();

    return res.status(200).json(answer);
  } catch (error) {
    return res.status(500).json({ message: "Failed to downvote answer" });
  }
};

export const getAnswers = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { cursor, limit = 10 } = req.query;

    const query = {
      question: questionId,
      parent: null, // Get only top-level answers
    };

    if (cursor) {
      query._id = { $lt: cursor };
    }

    const answers = await Answer.find(query)
      .populate("createdBy", "username email")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // console.log("Found answers:", answers);

    return res.status(200).json(answers);
  } catch (error) {
    console.error("Error in getAnswers:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch answers", error: error.message });
  }
};

export const getReplies = async (req, res) => {
  try {
    const { answerId } = req.params;
    const { cursor, limit = 5 } = req.query;

    const query = { parent: answerId };
    if (cursor) {
      query._id = { $lt: cursor };
    }

    const replies = await Answer.find(query)
      .sort({ _id: -1 })
      .limit(parseInt(limit))
      .populate("createdBy", "username");

    const hasMore = replies.length === parseInt(limit);

    res.json({
      replies,
      hasMore,
      nextCursor: hasMore ? replies[replies.length - 1]._id : null,
    });
  } catch (error) {
    console.error("Error in getReplies:", error);
    res.status(500).json({ error: error.message });
  }
};

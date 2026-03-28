const Post = require('../models/Post');
const Comment = require('../models/Comment');

// @route  GET /api/posts
// @access Public — published posts with search & pagination
exports.getPublicPosts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const search = req.query.search || '';
    const status = req.query.status || 'published';
    const sortBy = req.query.sortBy || 'createdAt';
    const skip = (page - 1) * limit;

    if (!['draft', 'published'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status filter' });
    }

    const query = {
      status,
      ...(search && {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { tags: { $regex: search, $options: 'i' } },
        ],
      }),
    };

    const total = await Post.countDocuments(query);
    const posts = await Post.find(query)
      .populate('author', 'name')
      .sort({ [sortBy]: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      posts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalPosts: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @route  GET /api/posts/my
// @access Private — author's own posts (draft + published)
exports.getMyPosts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const status = req.query.status;
    const sortBy = req.query.sortBy || 'createdAt';
    const skip = (page - 1) * limit;

    if (status && !['draft', 'published'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status filter' });
    }

    const baseQuery = req.user.role === 'admin' ? {} : { author: req.user._id };
    const query = {
      ...baseQuery,
      ...(status && { status }),
      ...(search && {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { tags: { $regex: search, $options: 'i' } },
        ],
      }),
    };

    const total = await Post.countDocuments(query);
    const posts = await Post.find(query)
      .populate('author', 'name email')
      .sort({ [sortBy]: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      posts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalPosts: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @route  GET /api/posts/:id
// @access Public
exports.getPost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id).populate('author', 'name email');

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    res.json({ success: true, post });
  } catch (err) {
    next(err);
  }
};

// @route  POST /api/posts
// @access Private
exports.createPost = async (req, res, next) => {
  try {
    const { title, content, tags, status } = req.body;

    const post = await Post.create({
      title,
      content,
      tags: tags || [],
      status: status || 'draft',
      author: req.user._id,
    });

    await post.populate('author', 'name email');

    res.status(201).json({ success: true, post });
  } catch (err) {
    next(err);
  }
};

// @route  PUT /api/posts/:id
// @access Private — owner or admin
exports.updatePost = async (req, res, next) => {
  try {
    let post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    if (req.user.role !== 'admin' && post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    post = await Post.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('author', 'name email');

    res.json({ success: true, post });
  } catch (err) {
    next(err);
  }
};

// @route  DELETE /api/posts/:id
// @access Private — owner or admin
exports.deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    if (req.user.role !== 'admin' && post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await post.deleteOne();

    await Comment.deleteMany({ post: req.params.id });

    res.json({ success: true, message: 'Post deleted' });
  } catch (err) {
    next(err);
  }
};

// @route  PATCH /api/posts/:id/status
// @access Private — owner or admin
exports.updatePostStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['draft', 'published'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    if (req.user.role !== 'admin' && post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    post.status = status;
    await post.save();

    res.json({ success: true, post });
  } catch (err) {
    next(err);
  }
};

// @route  GET /api/posts/:id/comments
// @access Public
exports.getComments = async (req, res, next) => {
  try {
    const comments = await Comment.find({ post: req.params.id })
      .populate('author', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, comments });
  } catch (err) {
    next(err);
  }
};

// @route  POST /api/posts/:id/comments
// @access Private
exports.addComment = async (req, res, next) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, message: 'Comment content is required' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const comment = await Comment.create({
      content,
      author: req.user._id,
      post: req.params.id,
    });

    await comment.populate('author', 'name');

    res.status(201).json({ success: true, comment });
  } catch (err) {
    next(err);
  }
};
const Post = require('../models/Post');

// @route  GET /api/posts/public
// @access Public — published posts only
exports.getPublicPosts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    const query = {
      status: 'published',
      ...(search && {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } },
        ],
      }),
    };
    const total = await Post.countDocuments(query);
    const posts = await Post.find(query)
      .populate('author', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// @route  GET /api/posts
// @access Private — admin sees all, author sees own
exports.getPosts = async (req, res, next) => {
  try {
    const query = req.user.role === 'admin' ? {} : { author: req.user._id };

    const posts = await Post.find(query)
      .populate('author', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, posts });
  } catch (err) {
    next(err);
  }
};

// @route  GET /api/posts/:id
// @access Private
exports.getPost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id).populate('author', 'name email');

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Authors can only view their own posts
    if (req.user.role !== 'admin' && post.author._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
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
    const { title, content, excerpt, status } = req.body;

    const post = await Post.create({
      title,
      content,
      excerpt,
      status,
      author: req.user._id,
    });

    await post.populate('author', 'name email');

    res.status(201).json({ success: true, post });
  } catch (err) {
    next(err);
  }
};

// @route  PUT /api/posts/:id
// @access Private
exports.updatePost = async (req, res, next) => {
  try {
    let post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Only admin or post owner can update
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
// @access Private
exports.deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Only admin or post owner can delete
    if (req.user.role !== 'admin' && post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await post.deleteOne();

    res.json({ success: true, message: 'Post deleted' });
  } catch (err) {
    next(err);
  }
};
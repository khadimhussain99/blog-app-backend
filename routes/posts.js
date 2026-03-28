const express = require('express');
const router = express.Router();
const {
  getPublicPosts,
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
} = require('../controllers/postController');
const { protect } = require('../middleware/auth');

// Public route — no auth needed
router.get('/public', getPublicPosts);

// Private routes — all require auth
router.use(protect);

router.route('/').get(getPosts).post(createPost);
router.route('/:id').get(getPost).put(updatePost).delete(deletePost);

module.exports = router;
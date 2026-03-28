const express = require('express');
const router = express.Router();
const {
  getPublicPosts,
  getMyPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  updatePostStatus,
  getComments,
  addComment,
} = require('../controllers/postController');
const { protect } = require('../middleware/auth');



// Private routes
router.use(protect);
router.get('/my', getMyPosts);
router.post('/', createPost);
router.put('/:id', updatePost);
router.delete('/:id', deletePost);
router.patch('/:id/status', updatePostStatus);
router.post('/:id/comments', addComment);

// Public routes
router.get('/', getPublicPosts);
router.get('/:id/comments', getComments);
router.get('/:id', getPost);

module.exports = router;
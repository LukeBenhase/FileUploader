const { Router } = require("express");

const multer = require("multer");
const path = require("path");
const usersController = require("../controllers/usersController");

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

const usersRouter = Router();

usersRouter.get("/", usersController.getHomepage);
usersRouter.get("/login", usersController.getLoginPage);
usersRouter.post("/login", usersController.loginUser);

usersRouter.get("/register", usersController.getRegisterPage);
usersRouter.post("/register", usersController.registerUser);

usersRouter.post("/logout", usersController.logoutUser);

usersRouter.get("/userPage", usersController.getUserPage);

usersRouter.post(
  "/create-card",
  upload.single("file"),
  usersController.createCard
);

usersRouter.post(
  "/create-card/:folderId",
  upload.single("file"),
  usersController.createCard
);
usersRouter.post("/create-folder", usersController.createFolder);
usersRouter.post("/create-folder/:folderId", usersController.createFolder);

usersRouter.get("/folders", usersController.getUserPage);
usersRouter.get("/folders/:folderId", usersController.getFolderContents);

usersRouter.get("/folders/edit/:folderId", usersController.getEditFolderPage);
usersRouter.post("/folders/edit/:folderId", usersController.editFolder);
usersRouter.post("/folders/delete/:folderId", usersController.deleteFolder);

usersRouter.get("/files/:fileId", usersController.getFileInfo);
usersRouter.get("/files/edit/:fileId", usersController.getEditFilePage);
usersRouter.post("/files/edit/:fileId", usersController.editFile);
usersRouter.post("/files/delete/:fileId", usersController.deleteFile);

usersRouter.post("/files/download/:fileId", usersController.downloadFile);

module.exports = usersRouter;

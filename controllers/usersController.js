const passport = require("passport");
const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();

async function getHomepage(req, res) {
  res.render("homePage");
}

async function getLoginPage(req, res) {
  res.render("login");
}

async function getRegisterPage(req, res) {
  res.render("signUp");
}

async function getUserPage(req, res) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  // get the files
  const files = await prisma.file.findMany({
    where: { userId: req.user.id },
    orderBy: { name: "asc" },
  });
  // get the folders
  const folders = await prisma.folder.findMany({
    where: { authorId: req.user.id, parentID: null },
    orderBy: { name: "asc" },
  });
  // render the page

  res.render("userPage", { user: req.user, files: files, folders: folders });
}

async function loginUser(req, res, next) {
  passport.authenticate("local", {
    successRedirect: "/userPage",
    failureRedirect: "/login",
    failureMessage: true,
  })(req, res, next);
}

async function logoutUser(req, res) {
  req.logout((err) => {
    if (err) return res.status(500).json({ message: "Logout failed" });
    res.redirect("/");
  });
}

async function registerUser(req, res, next) {
  // Registration logic here (hash password, create user, etc.)
  await passport.registerUser(req, res, async (err) => {
    if (err) {
      return res.render("signUp", {
        messages: {
          error: "Registration failed, email may already be in use.",
        },
      });
    }
    // On successful registration, send user to login
    res.redirect("/login");
  });
}

async function createCard(req, res) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const filePath = req.file.path;
  const fileName = req.body.name || req.file.originalname;
  const fileSize = req.file.size;
  const userId = req.user.id;
  const sharable = req.body.isShareable === "on";
  const folderId = req.params.folderId || null;

  await prisma.file.create({
    data: {
      fileURL: filePath,
      name: fileName,
      size: fileSize,
      userId: userId,
      sharable: sharable,
      folderId: parseInt(folderId),
    },
  });

  res.redirect("/userPage");
}

async function getFileInfo(req, res) {
  const fileId = req.params.fileId;
  const userId = req.user ? req.user.id : null;

  let file = await prisma.file.findUnique({
    where: { id: parseInt(fileId) },
  });

  if (userId == null) {
    //make sure that file is sharable
    if (!file || !file.sharable) {
      return res
        .status(404)
        .json({ message: "File not found or not sharable" });
    }
    // if it is sharable make sure that the date is not expired
    if (file.sharableUntil && new Date() > file.sharableUntil) {
      return res
        .status(404)
        .json({ message: "File not found or not sharable" });
    }
  }
  const owner = await prisma.user.findUnique({
    where: { id: file.userId },
    select: { username: true, email: true },
  });
  file.owner = owner;

  res.render("fileInfo", { file: file, user: userId });
}

async function getEditFilePage(req, res) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const fileId = req.params.fileId;
  const userId = req.user.id;
  const file = await prisma.file.findUnique({
    where: { id: parseInt(fileId), userId: userId },
  });
  if (!file) {
    return res.status(404).json({ message: "File not found" });
  }
  res.render("editFile", { file: file });
}

async function editFile(req, res) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const fileId = req.params.fileId;
  const userId = req.user.id;

  const file = await prisma.file.findUnique({
    where: { id: parseInt(fileId), userId: userId },
  });
  if (!file) {
    return res.status(404).json({ message: "File not found" });
  }

  const updatedFile = await prisma.file.update({
    where: { id: parseInt(fileId), userId: userId },
    data: {
      name: req.body.name,
      sharable: req.body.sharable === "true",
      sharableUntil: req.body.sharableUntil
        ? new Date(req.body.sharableUntil)
        : null,
    },
  });

  res.redirect(`/files/${updatedFile.id}`);
}

async function deleteFile(req, res) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const fileId = req.params.fileId;
  const userId = req.user.id;

  const file = await prisma.file.findUnique({
    where: { id: parseInt(fileId), userId: userId },
  });
  if (!file) {
    return res.status(404).json({ message: "File not found" });
  }

  await prisma.file.delete({
    where: { id: parseInt(fileId), userId: userId },
  });

  res.redirect("/userPage");
}

async function downloadFile(req, res) {
  const fileId = req.params.fileId;
  const userId = req.user ? req.user.id : null;

  let file = await prisma.file.findUnique({
    where: { id: parseInt(fileId) },
  });

  if (userId == null) {
    //make sure that file is sharable
    if (!file || !file.sharable) {
      return res
        .status(404)
        .json({ message: "File not found or not sharable" });
    }
    // if it is sharable make sure that the date is not expired
    if (file.sharableUntil && new Date() > file.sharableUntil) {
      return res
        .status(404)
        .json({ message: "File not found or not sharable" });
    }
  }

  res.download(file.fileURL, file.name);
}

async function createFolder(req, res) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const parentID = req.params.folderId || null;
  const folderName = req.body.name;
  const userId = req.user.id;

  await prisma.folder.create({
    data: {
      name: folderName,
      authorId: userId,
      parentID: parseInt(parentID),
    },
  });

  res.redirect("/userPage");
}

async function getFolderContents(req, res) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const folderId = req.params.folderId;
  const userId = req.user.id;

  const folderContentsFolders = await prisma.folder.findMany({
    where: { authorId: userId, parentID: parseInt(folderId) },
  });
  const folderContentsFiles = await prisma.file.findMany({
    where: { userId: userId, folderId: parseInt(folderId) },
  });

  res.render("userPage", {
    user: req.user,
    folderInfo: await prisma.folder.findUnique({
      where: { id: parseInt(folderId) },
    }),
    //folderId: folderId,
    folders: folderContentsFolders,
    files: folderContentsFiles,
  });
}

async function getEditFolderPage(req, res) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const folderId = req.params.folderId;
  const userId = req.user.id;
  const folder = await prisma.folder.findUnique({
    where: { id: parseInt(folderId), authorId: userId },
  });
  if (!folder) {
    return res.status(404).json({ message: "Folder not found" });
  }

  res.render("folderInfo", { folder: folder });
}

async function editFolder(req, res) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const folderId = req.params.folderId;
  const userId = req.user.id;
  const newName = req.body.name;

  const folder = await prisma.folder.update({
    where: { id: parseInt(folderId), authorId: userId },
    data: { name: newName },
  });
  if (!folder) {
    return res.status(404).json({ message: "Folder not found" });
  }
  res.redirect("/userPage");
}

async function deleteFolder(req, res) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const folderId = req.params.folderId;
  const userId = req.user.id;

  const folder = await prisma.folder.findUnique({
    where: { id: parseInt(folderId), authorId: userId },
  });
  if (!folder) {
    return res.status(404).json({ message: "Folder not found" });
  }

  await prisma.folder.delete({
    where: { id: parseInt(folderId), authorId: userId },
  });

  res.redirect("/userPage");
}

module.exports = {
  getHomepage,
  getLoginPage,
  getRegisterPage,
  loginUser,
  logoutUser,
  registerUser,
  createCard,
  getUserPage,
  createFolder,
  getFolderContents,
  getEditFolderPage,
  editFolder,
  deleteFolder,
  getFileInfo,
  getEditFilePage,
  editFile,
  deleteFile,
  downloadFile,
};

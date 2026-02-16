const users = [];

function userJoin(id, username, room) {
  const existingIndex = users.findIndex(user => user.id === id);
  if (existingIndex !== -1) {
    users.splice(existingIndex, 1);
  }

  const cleanUsername = (username || 'Guest').toString().trim().slice(0, 30);
  const cleanRoom = (room || 'general').toString().trim().slice(0, 40);
  const user = {
    id,
    username: cleanUsername || 'Guest',
    room: cleanRoom || 'general',
    status: 'online'
  };

  users.push(user);
  return user;
}

function getCurrentUser(id) {
  return users.find(user => user.id === id);
}

function userLeave(id) {
  const index = users.findIndex(user => user.id === id);
  if (index !== -1) {
    return users.splice(index, 1)[0];
  }

  return undefined;
}

function getRoomUsers(room) {
  return users.filter(user => user.room === room);
}

function updateUserStatus(id, status) {
  const user = users.find(candidate => candidate.id === id);
  if (user) {
    user.status = status;
  }

  return user;
}

module.exports = {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
  updateUserStatus
};

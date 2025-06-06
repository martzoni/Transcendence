let blockedUsers = [];

let activeConversationId = 0;

async function updateBlockedUsers() {
  let isAuthenticated = await checkAuthentication();
  if (!isAuthenticated) return;
  fetch(`/api/messaging/conversations/blocked-users/`) // Endpoint pour récupérer les utilisateurs bloqués
    .then((response) => response.json())
    .then((data) => {
      blockedUsers = data.blocked_users; // Stocker les utilisateurs bloqués dans une variable
    })
    .catch((error) =>
      console.error(
        "Erreur lors de la récupération des utilisateurs bloqués:",
        error
      )
    );
}

async function goLobby() {
  tour = await getTourByConversation(activeConversationId);
  console.log("Tour -> : ", tour);
  window.location.href = `/#tournaments?tourid=${tour}`;
}

async function getTourByConversation(conversationId) {
  try {
    // Appeler l'API pour récupérer l'ID du tournoi lié à la conversation
    const response = await fetch(
      `/api/messaging/conversations/tour-by-conversation/${conversationId}/`
    );

    if (!response.ok) {
      throw new Error(
        `Erreur lors de la récupération du tournoi : ${response.status}`
      );
    }

    const data = await response.json();

    // Vérifie si l'ID du tournoi est bien présent dans la réponse
    if (data.tour_id) {
      return data.tour_id; // Retourne l'ID du tournoi
    } else {
      console.warn("Aucun tournoi associé à cette conversation.");
      return null;
    }
  } catch (error) {
    console.error(
      "Erreur lors de la récupération du tournoi pour la conversation :",
      error
    );
  }
}

function toggleBlockUser() {
  const blockButton = document.getElementById("muted-icon");
  fetch(`/api/messaging/conversations/${activeConversationId}/toggle-block/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCSRFToken(),
    },
    body: JSON.stringify({}),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.blocked) {
        blockButton.classList.replace("fa-volume-xmark", "fa-volume-high");
        loadModal(
          "User muted",
          "You'll no longer receive messages from this user."
        );
      } else {
        blockButton.classList.replace("fa-volume-high", "fa-volume-xmark");
        loadModal("User unmuted", "You'll receive messages from this user.");
      }
      updateBlockedUsers();
    })
    .catch((error) =>
      console.error("Erreur lors du changement de l'état du blocage:", error)
    );
}

let selectedUserId = null;

function loadConversationModal() {
  fetch("/static/messaging/html/conversationModal.html")
    .then((response) => response.text())
    .then((html) => {
      const existingModal = document.getElementById("conversationModal");
      if (existingModal) {
        existingModal.remove();
      }
      document.body.insertAdjacentHTML("beforeend", html);
      const modalElement = document.getElementById("conversationModal");
      if (modalElement) {
        const myModal = new bootstrap.Modal(modalElement);
        myModal.show();
      } else {
        console.error("Le modal de conversation n'a pas été trouvé.");
      }
    })
    .catch((error) =>
      console.error(
        "Erreur lors du chargement du modal de conversation:",
        error
      )
    );
}

function deleteModal() {
  const modalElement = document.getElementById("conversationModal");
  const myModal = bootstrap.Modal.getInstance(modalElement);

  modalElement.addEventListener("hidden.bs.modal", function () {
    modalElement.remove();
  });

  myModal.hide();
}

function searchUser() {
  const query = document.getElementById("searchUserInput").value;

  if (query.length > 0) {
    fetch(`/api/users/profiles/search/?query=${query}`) // Remplacer par ton endpoint API de recherche d'utilisateur
      .then((response) => response.json())
      .then((users) => {
        const resultsList = document.getElementById("searchResults");
        resultsList.innerHTML = ""; // Réinitialiser les résultats

        users.forEach((user) => {
          if (
            user.username !== currentUser &&
            user.username !== "Bot" &&
            user.username !== "LocalPlayer"
          ) {
            // Exclure l'utilisateur actuel
            const userItem = document.createElement("li");
            userItem.textContent = user.username;
            userItem.onclick = () => selectUser(user.username); // Sélectionner un utilisateur
            resultsList.appendChild(userItem);
          }
        });
      });
  }
}

function startConversation() {
  const participants = [selectedUserId, currentUser]; // Liste des participants : utilisateur sélectionné et utilisateur actuel
  console.log(`startConversation...`);
  // Envoyer une requête POST pour créer une nouvelle conversation avec plusieurs participants
  fetch("/api/messaging/conversations/create_conversation/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCSRFToken(), // Assure-toi de bien gérer le token CSRF
    },
    body: JSON.stringify({
      participants: participants, // Envoyer la liste des participants
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Erreur lors de la création de la conversation");
      }
      return response.json();
    })
    .then((data) => {
      // Charger les conversations et fermer la modal
      connectWebSocket();
      loadConversations();
      console.log(` data.id :${data.id}`);
      loadMessages(data.id);
      deleteModal();
    })
    .catch((error) => {
      console.error("Erreur lors de la création de la conversation:", error);
    });
}

// Fonction pour sélectionner un utilisateur et démarrer la conversation

function selectUser(username) {
  selectedUserId = username; // Stocke l'ID de l'utilisateur sélectionné
  console.log(`Utilisateur sélectionné : ${username}`);
  // Afficher le bouton
  const button = document.getElementById("start-conversation-btn");
  button.style.display = "block"; // Rendre le bouton visible

  // Mettre à jour le texte du bouton avec le nom d'utilisateur sélectionné
  button.textContent = `Start chatting with ${username}`;
  // Appeler la fonction pour démarrer la conversation avec l'utilisateur sélectionné
  // startConversation(selectedUserId);
}

function loadChat() {
  fetch("/static/messaging/html/chat.html")
    .then((response) => response.text())
    .then((html) => {
      document.getElementById("app").innerHTML = html;

      // Charger la liste des conversations
      loadConversations();

      // Ouvrir la WebSocket globale pour l'utilisateur
      connectWebSocket(); // La WebSocket globale est connectée ici

      // Associer l'envoi de message au bouton "Envoyer"
      document.getElementById("send-message").addEventListener("click", () => {
        const conversationId = getActiveConversationId(); // Obtenir l'ID de la conversation active
        const messageInput = document.getElementById("message-input");
        const message = messageInput.value;

        if (conversationId && message.trim() !== "") {
          sendMessage(conversationId, message); // Envoyer le message à cette conversation
          messageInput.value = ""; // Réinitialiser le champ de saisie après l'envoi
        }
        // else {
        //     console.error("Aucune conversation active sélectionnée ou message vide");
        // }
      });

      // Associer l'envoi de message à la touche "Entrée"
      document
        .getElementById("message-input")
        .addEventListener("keypress", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            const conversationId = getActiveConversationId();
            const message = document.getElementById("message-input").value;

            if (conversationId && message.trim() !== "") {
              sendMessage(conversationId, message); // Envoyer le message à cette conversation
              document.getElementById("message-input").value = ""; // Réinitialiser le champ de saisie après l'envoi
            }
            // else {
            //     console.error("Aucune conversation active sélectionnée ou message vide");
            // }
          }
        });
    })
    .catch((error) =>
      console.error("Erreur lors du chargement du chat:", error)
    );
} // Variable globale pour stocker l'ID de la conversation active

function getActiveConversationId() {
  return activeConversationId; // Retourner l'ID de la conversation active
}

function loadConversations() {
  fetch("/api/messaging/conversations/")
    .then((response) => response.json())
    .then((conversations) => {
      const convList = document.querySelector(".discussion-list");
      convList.innerHTML = "";

      conversations.forEach((conversation) => {
        const convItem = document.createElement("div");
        const button = document.createElement("button");
        button.classList.add(
          "btn",
          "btn-primary",
          "w-100",
          "user-conversation",
          "mt-1",
          "mb-1"
        ); // Ajouter des classes pour le style

        const otherParticipants = conversation.participants.filter(
          (participant) => participant !== currentUser
        );
        const participantsText = otherParticipants.join(", ");

        if (conversation.tour) {
          button.textContent = `Tournament ${conversation.tour} : ${participantsText}`;
        } else {
          button.textContent = `Chatting with ${participantsText}`;
        }

        button.addEventListener("click", () => {
          loadMessages(conversation.id); // Charger les messages de cette conversation
          // openWebSocket(conversation.id);  // Ouvrir la WebSocket pour cette conversation
        });

        convItem.appendChild(button);
        convList.appendChild(convItem);
      });
    });
}

function loadMessages(conversationId) {
  const chatWindow = document.getElementById("chat_window");
  // console.log(`activeConversationId: ${activeConversationId} | conversationId: ${conversationId}`);

  // if (activeConversationId === conversationId) {
  //   activeConversationId == null;
  //   return;
  // }

  // Requête pour obtenir les participants de la conversation
  fetch(`/api/messaging/conversations/${conversationId}/`)
    .then((response) => response.json())
    .then((conversation) => {
      const otherParticipants = conversation.participants.filter(
        (participant) => participant !== currentUser
      );

      // Transformer chaque nom en lien cliquable
      const participantsLinks = otherParticipants.map((participant) => {
        return `<a href="/#profile/?username=${participant}" class="participant-link" onclick="window.location.href='/#profile/?username=${participant}'; return false;">${participant}</a>`;
      });

      const participantsText = participantsLinks.join(", ");

      // Met à jour le titre de la conversation
      let chatTitle = document.getElementById("chat_title");
      let interButton = document.getElementById("interaction-chat");
      let tourButton = document.getElementById("interaction-tour");
      if (conversation.tour) {
        interButton.style.display = "none";
        tourButton.style.display = "block";
        chatTitle.innerHTML = `Tournament chat  ${conversation.tour} with  ${participantsText}`;
      } else {
        interButton.style.display = "block";
        tourButton.style.display = "none";
        chatTitle.innerHTML = `Chatting with ${participantsText}`;
      }

      // Rendre visible la fenêtre de chat
      chatWindow.classList.remove("d-none");

      attachGameFormSubmitListener(currentUser, otherParticipants[0], true);
      // Requête pour obtenir les messages
      fetch(`/api/messaging/conversations/${conversationId}/messages/`)
        .then((response) => response.json())
        .then((messages) => {
          const messagesList = document.getElementById("chat-messages-div");
          messagesList.innerHTML = ""; // Réinitialiser la zone des messages

          messages.forEach((message) => {
            const messageItem = document.createElement("div");
            const isUserMessage = message.sender === currentUser; // Le nom d'utilisateur de l'expéditeur
            if (blockedUsers.includes(message.sender)) {
              return; // Ne pas traiter ce message
            }
            messageItem.classList.add(
              "d-flex",
              isUserMessage ? "justify-content-end" : "justify-content-start"
            );

            const messageContent = document.createElement("div");
            messageContent.classList.add(
              "chat-message",
              isUserMessage ? "external-message" : "user-message"
            );

            if (message.invitation) {
              messageContent.classList.replace(
                "chat-message",
                "invitation-message"
              );
              const invitationLink = document.createElement("a");
              invitationLink.href = `/#game?sessionid=${message.invitation}`; // Créer l'URL
              invitationLink.textContent = "Join Game"; // Texte du lien
              invitationLink.style.textDecoration = "none";
              invitationLink.style.color = "inherit";
              // Optionnel : Si tu ne veux pas utiliser href, tu peux utiliser un gestionnaire d'événement de clic.
              invitationLink.addEventListener("click", function (event) {
                event.preventDefault(); // Empêche le comportement par défaut du lien
                window.location.href = `/#game?sessionid=${message.invitation}`;
              });
              messageContent.appendChild(invitationLink);
            }
            if (message.content) {
              messageContent.textContent = message.content;
            }

            messageItem.appendChild(messageContent);
            messagesList.appendChild(messageItem);
          });
          activeConversationId = conversationId;
          // Scroller en bas de la zone de messages
          messagesList.scrollTop = messagesList.scrollHeight;
        })
        .catch((error) =>
          console.error("Erreur lors de la récupération des messages:", error)
        );

      // Requête pour vérifier l'état de blocage
      fetch(
        `/api/messaging/conversations/${conversationId}/check-block-status/`
      )
        .then((response) => response.json())
        .then((data) => {
          const blockButton = document.getElementById("muted-icon");
          if (data.blocked) {
            blockButton.classList.replace("fa-volume-xmark", "fa-volume-high");
          } else {
            blockButton.classList.replace("fa-volume-high", "fa-volume-xmark");
          }
          blockButton.style.display = "inline-block";
        })
        .catch((error) =>
          console.error(
            "Erreur lors de la récupération de l'état de blocage:",
            error
          )
        );
    })
    .catch((error) =>
      console.error("Erreur lors de la récupération des participants:", error)
    );
}

function displayNewMessage(data) {
  const messagesList = document.getElementById("chat-messages-div");

  const messageItem = document.createElement("div");

  // Vérifier si l'utilisateur actuel est l'expéditeur
  const isUserMessage = data.sender === currentUser;

  // Ajout des classes CSS en fonction de l'expéditeur
  messageItem.classList.add(
    "d-flex",
    isUserMessage ? "justify-content-end" : "justify-content-start"
  );

  const messageContent = document.createElement("div");

  // Ajouter des styles en fonction de l'expéditeur (vert pour l'utilisateur, autre couleur pour les autres)
  messageContent.classList.add(
    "chat-message",
    isUserMessage ? "external-message" : "user-message"
  );
  messageContent.textContent = data.message;

  messageItem.appendChild(messageContent);
  messagesList.appendChild(messageItem);

  // Scroller automatiquement en bas de la zone de messages
  messagesList.scrollTop = messagesList.scrollHeight;
}

function displayInvitation(data) {
  const messagesList = document.getElementById("chat-messages-div");

  const messageItem = document.createElement("div");

  // Vérifier si l'utilisateur actuel est l'expéditeur
  const isUserMessage = data.sender === currentUser;

  // Ajout des classes CSS en fonction de l'expéditeur
  messageItem.classList.add(
    "d-flex",
    isUserMessage ? "justify-content-end" : "justify-content-start"
  );

  const messageContent = document.createElement("div");

  // Ajouter des styles en fonction de l'expéditeur (vert pour l'utilisateur, autre couleur pour les autres)
  messageContent.classList.add(
    "invitation-message",
    isUserMessage ? "external-message" : "user-message"
  );

  // Vérifier si le message contient une invitation
  if (data.invitation) {
    const invitationLink = document.createElement("a");
    invitationLink.href = `/#game?sessionid=${data.invitation}`; // Créer l'URL de l'invitation
    invitationLink.addEventListener("click", function (event) {
      event.preventDefault(); // Empêche le comportement par défaut du lien
      window.location.href = `/#game?sessionid=${data.invitation}`;
    });

    invitationLink.textContent = "Join Game";
    invitationLink.classList.add(
      isUserMessage ? "external-message" : "user-message"
    );
    invitationLink.style.textDecoration = "none";

    messageContent.appendChild(invitationLink);
  } else {
    // Si ce n'est pas une invitation, afficher le contenu comme un message normal
    messageContent.textContent = data.message;
  }

  messageItem.appendChild(messageContent);
  messagesList.appendChild(messageItem);

  // Scroller automatiquement en bas de la zone de messages
  messagesList.scrollTop = messagesList.scrollHeight;
}
// ------------------------>> WEBSOCKET

let socket;

function connectWebSocket() {
  // Si une WebSocket existe déjà, on la ferme avant d'en ouvrir une nouvelle
  if (socket) {
    socket.close();
  }
  if (!currentUser) return;
  // Ouvrir la WebSocket globale pour l'utilisateur
  socket = new WebSocket(`/ws/chat/`);

  // Gérer l'ouverture de la WebSocket
  socket.onopen = function (e) {
    // console.log("Connexion WebSocket établie");
    // Optionnel : Informer le serveur que l'utilisateur est connecté
    socket.send(
      JSON.stringify({
        type: "new_connection",
        content: {},
      })
    );
  };

  // Gérer la réception des messages WebSocket
  socket.onmessage = function (e) {
    const data = JSON.parse(e.data);

    // Vérifier le type du message reçu
    if (data.type === "updateTree") {
      // console.log("data.content.tour : ", data.content);
      updateTree(data.content.tour);
    }
    if (data.type === "upload_message") {
      if (data.content.tour) updateTree(data.content.tour);
      const conversationId = data.content.conversation_id; // Récupérer l'ID de la conversation
      const messageSender = data.content.sender; // Le nom d'utilisateur de l'expéditeur

      // Vérifier si le message provient d'un utilisateur bloqué
      if (blockedUsers.includes(messageSender)) {
        console.log(
          `Message de ${messageSender} bloqué parmis ${blockedUsers}`
        );
        return; // Ne pas traiter ce message
      }
      // const message = data.content.message;  // Récupérer le contenu du message
      // Afficher le message dans la boîte de la conversation correspondante
      // console.log(`activeConversationId : ${activeConversationId} | data.content.conversation_id : ${data.content.conversation_id}`);
      if (activeConversationId === conversationId)
        displayNewMessage(data.content);
      // loadMessages(conversationId);
    } else if (data.type === "upload_invitation") {
      const conversationId = data.content.conversation_id;
      const messageSender = data.content.sender; // Le nom d'utilisateur de l'expéditeur
      if (blockedUsers.includes(messageSender)) {
        console.log(
          `Message de ${messageSender} bloqué parmis ${blockedUsers}`
        );
        return; // Ne pas traiter ce message
      }
      if (activeConversationId === conversationId && messageSender != currentUserInfo.user.username) {
        displayInvitation(data.content);
      }
    } else {
      console.log(`Type de message non géré : ${data.type}`);
    }
  };

  // Gestion de la fermeture de la WebSocket
  socket.onclose = function (e) {
    console.log("WebSocket fermée");
  };

  // Gestion des erreurs WebSocket
  socket.onerror = function (e) {
    console.log("Erreur WebSocket", e);
  };
}

function sendMessage(conversationId, message) {
  // Envoi du message à travers la WebSocket
  socket.send(
    JSON.stringify({
      type: "newMessage",
      content: {
        conversation_id: conversationId,
        message: message,
        sender: currentUser,
      },
    })
  );
}

function sendTourConv(conversationId, message) {
  // Envoi du message à travers la WebSocket
  socket.send(
    JSON.stringify({
      type: "newTourMessage",
      content: {
        conversation_id: conversationId,
        message: message,
      },
    })
  );
}

function sendInvitation(conversationId, invitation) {
  // Envoi du message à travers la WebSocket
  socket.send(
    JSON.stringify({
      type: "newInvitation",
      content: {
        conversation_id: conversationId,
        sender: currentUser,
        invitation: invitation,
      },
    })
  );
}

function setupChatInterface(socket) {
  // Vérifier l'état de l'utilisateur (si il est authentifié)
  const userIsAuthenticated = false; //{{ user.is_authenticated|lower }};

  if (userIsAuthenticated) {
    console.log("Utilisateur authentifié, interface de chat active.");

    // Boucler sur tous les boutons d'envoi de message pour chaque conversation
    document.querySelectorAll(".send-message").forEach((button) => {
      button.onclick = function () {
        const conversationId = this.getAttribute("data-conversation-id"); // Récupérer l'ID de la conversation
        const messageInput = document.querySelector(
          `#message-input-${conversationId}`
        );
        const message = messageInput.value;

        // Envoyer le message avec l'ID de la conversation via la WebSocket
        if (message && socket.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({
              conversation_id: conversationId,
              message: message,
            })
          );
          messageInput.value = ""; // Réinitialiser le champ de saisie après envoi
        } else {
          console.error(
            "Message non envoyé : WebSocket non connectée ou message vide."
          );
        }
      };
    });
  } else {
    console.log("Utilisateur non authentifié.");
  }
}

document.addEventListener("DOMContentLoaded", function () {
  // 1. Connexion WebSocket
  const socket = connectWebSocket();
  updateBlockedUsers();

  // 2. Configuration de l'interface de chat
  // setupChatInterface(socket);
});

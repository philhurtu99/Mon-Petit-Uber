import { useState, useRef, useEffect } from "react";
import { API_URL } from "../../config";
import styles from "./faqBot.module.css";

type Message = {
  id: string;
  sender: "bot" | "user";
  text: string;
};

type BotAnswer = {
  answer?: string;
  category?: string;
  rank?: number;
  score?: number;
};

type ResponseOption = {
  rank: number;
  text: string;
  category: string;
  score: number;
};

export default function FaqBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-1",
      sender: "bot",
      text: "Salut ! Je suis Edouard. De quoi veux-tu parler ?",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const resetChat = () => {
    setSelectedCategory(null);
    setResponseOptions([]);
    setMessages([
      {
        id: "welcome-1",
        sender: "bot",
        text: "Salut ! Je suis Edouard. De quoi veux-tu parler ?",
      },
    ]);
    setInputValue("");
  };

  const [responseOptions, setResponseOptions] = useState<ResponseOption[]>([]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    const text = inputValue.trim();
    if (!text) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: text,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setResponseOptions([]);
    setIsLoading(true);

    try {
      const res = await fetch(
        `${API_URL}/api/bot/questions?searchText=${encodeURIComponent(text)}&category=${selectedCategory || "AUTRE"}`,
      );

      const data = await res.json();

      let botResponseText = "";

      if (Array.isArray(data) && data.length > 0) {
        const options = data.map((item: BotAnswer, index: number) => ({
          rank: item.rank ?? index + 1,
          text: item.answer?.trim() || "Réponse indisponible.",
          category: item.category ?? "AUTRE",
          score: item.score ?? 0,
        }));

        setResponseOptions(options);

        let categoryMessage = "";
        if (selectedCategory) {
          categoryMessage = `Parfait ! Pour "${selectedCategory}", je trouve ces réponses :`;
        } else {
          categoryMessage = "Je trouve ces réponses pour toi :";
        }

        botResponseText = `${categoryMessage} Sélectionne la carte la plus adaptée.`;
      } else {
        botResponseText =
          "Désolé, je n'ai pas trouvé de réponse à cette question. Essaie de formuler différemment !";
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: botResponseText,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Erreur lors de la communication avec le bot:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: "Oups ! J'ai un problème de connexion avec le serveur.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerClick = (item: ResponseOption) => {
    const selectedText = item.text;

    setResponseOptions([]);

    setMessages((prev) => [
      ...prev,
      {
        id: (Date.now() + 100).toString(),
        sender: "bot",
        text: `Réponse ${item.rank} sélectionnée (${item.category}) :

    ${selectedText}`,
      },
      {
        id: (Date.now() + 200).toString(),
        sender: "bot",
        text: "Est-ce que cette réponse t'a aidé ?",
      },
    ]);
  };

  const toggleBot = () => {
    setIsOpen(!isOpen);
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setResponseOptions([]);

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: "user",
        text: category === "AUTRE" ? "Autre sujet" : category,
      },
    ]);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "bot",
          text: `Parfait ! Pose-moi ta question sur ${category === "AUTRE" ? "ce sujet" : "la " + category.toLowerCase()}.`,
        },
      ]);
    }, 500);
  };

  return (
    <div className={styles.botContainer}>
      {isOpen && (
        <div className={styles.chatWindow}>
          <div className={styles.chatHeader}>
            <div className={styles.headerInfo}>
              <span className={styles.botAvatar}>🟢</span>
              <div>
                <h3 className={styles.botName}>Édouard</h3>
                <span className={styles.botStatus}>En ligne</span>
              </div>
            </div>
            <div className={styles.headerButtons}>
              <button
                onClick={resetChat}
                className={styles.resetButton}
                title="Recommencer"
              >
                ↻
              </button>
              <button onClick={toggleBot} className={styles.closeButton}>
                ✕
              </button>
            </div>
          </div>

          <div className={styles.messagesArea}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`${styles.messageWrapper} ${
                  msg.sender === "user" ? styles.wrapperUser : styles.wrapperBot
                }`}
                style={
                  msg.sender === "bot"
                    ? { flexDirection: "column", alignItems: "flex-start" }
                    : undefined
                }
              >
                <div
                  className={`${styles.messageBubble} ${
                    msg.sender === "user" ? styles.bubbleUser : styles.bubbleBot
                  }`}
                >
                  {msg.text}
                </div>

                {msg.id === "welcome-1" && !selectedCategory && (
                  <div className={styles.optionsContainer}>
                    <button
                      onClick={() => handleCategorySelect("LIVRAISON")}
                      className={styles.optionBtn}
                    >
                      Livraison
                    </button>
                    <button
                      onClick={() => handleCategorySelect("PAIEMENT")}
                      className={styles.optionBtn}
                    >
                      Paiement
                    </button>
                    <button
                      onClick={() => handleCategorySelect("MENU")}
                      className={styles.optionBtn}
                    >
                      Produits
                    </button>
                    <button
                      onClick={() => handleCategorySelect("AUTRE")}
                      className={styles.optionBtn}
                    >
                      Autre
                    </button>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className={`${styles.messageWrapper} ${styles.wrapperBot}`}>
                <div
                  className={`${styles.messageBubble} ${styles.bubbleBot} ${styles.typingIndicator}`}
                >
                  <span>.</span>
                  <span>.</span>
                  <span>.</span>
                </div>
              </div>
            )}
            {responseOptions.length > 0 && (
              <div
                className={`${styles.messageWrapper} ${styles.wrapperBot} ${styles.responsesWrapper}`}
              >
                <div className={styles.responseOptionsContainer}>
                  {responseOptions.map((option, index) => (
                    <button
                      key={`${option.rank}-${option.category}-${index}`}
                      type="button"
                      onClick={() => handleAnswerClick(option)}
                      className={`${styles.optionCard} ${
                        index === 0 ? styles.topOption : ""
                      }`}
                    >
                      <span
                        className={`${styles.rankBadge} ${
                          index === 0
                            ? styles.rankBadge1
                            : index === 1
                              ? styles.rankBadge2
                              : styles.rankBadge3
                        }`}
                        aria-hidden="true"
                      >
                        {option.rank}
                      </span>
                      <span className={styles.optionContent}>
                        <span className={styles.optionHeader}>
                          <span className={styles.optionTitle}>
                            Réponse {option.rank}
                          </span>
                          <span className={styles.optionMeta}>
                            Score {option.score} - {option.category}
                          </span>
                        </span>
                        <span className={styles.optionText}>{option.text}</span>
                        <span className={styles.optionAction}>
                          Choisir cette réponse
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className={styles.inputArea}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Écris un message..."
              className={styles.chatInput}
              disabled={isLoading || !selectedCategory}
              autoFocus
            />
            <button
              type="submit"
              className={styles.sendButton}
              disabled={!inputValue.trim() || isLoading}
            >
              ➤
            </button>
          </form>
        </div>
      )}

      <button onClick={toggleBot} className={styles.floatingButton}>
        {isOpen ? (
          <span className={styles.iconClose}>↓</span>
        ) : (
          <span className={styles.iconChat}>💬</span>
        )}
      </button>
    </div>
  );
}

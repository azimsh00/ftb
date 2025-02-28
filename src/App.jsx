import React, { useState, useEffect } from 'react';

const SUITS = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
const VALUES = Array.from({ length: 13 }, (_, i) => i + 2);
const INITIAL_BALANCE = 1000;
const REVEAL_DELAY = 500;

// PlayingCard Component
const PlayingCard = ({ card, position }) => {
  const getSuitColor = (suit) => {
    return suit === 'Hearts' || suit === 'Diamonds' ? 'text-red-600' : 'text-gray-900';
  };

  const getSuitSymbol = (suit) => {
    switch (suit) {
      case 'Hearts': return '♥';
      case 'Diamonds': return '♦';
      case 'Clubs': return '♣';
      case 'Spades': return '♠';
      default: return '';
    }
  };

  const getValue = (value) => {
    switch (value) {
      case 14: return 'A';
      case 13: return 'K';
      case 12: return 'Q';
      case 11: return 'J';
      default: return value;
    }
  };

  return (
    <div 
      className={`absolute bg-white rounded-lg shadow-lg border border-white/20 w-28 h-44 flex flex-col justify-between p-4 transition-transform hover:-translate-y-1 duration-200`}
      style={{ left: `${position * 130}px` }}
    >
      <div className={`text-xl font-bold ${getSuitColor(card.suit)}`}>{getValue(card.value)}</div>
      <div className={`text-4xl text-center ${getSuitColor(card.suit)}`}>{getSuitSymbol(card.suit)}</div>
      <div className={`text-xl font-bold text-right ${getSuitColor(card.suit)}`}>{getValue(card.value)}</div>
    </div>
  );
};

// Stats Display Component
const StatsDisplay = ({ stats }) => (
  <div className="w-full max-w-2xl bg-white/90 backdrop-blur rounded-lg shadow-lg p-6">
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
      <div className="text-center">
        <p className="text-gray-600 text-sm">Wins</p>
        <p className="text-blue-600 text-2xl font-bold">{stats.wins}</p>
      </div>
      <div className="text-center">
        <p className="text-gray-600 text-sm">Losses</p>
        <p className="text-red-600 text-2xl font-bold">{stats.losses}</p>
      </div>
      <div className="text-center">
        <p className="text-gray-600 text-sm">Highest Win</p>
        <p className="text-blue-600 text-2xl font-bold">${stats.highestWin}</p>
      </div>
      <div className="text-center">
        <p className="text-gray-600 text-sm">Win Rate</p>
        <p className="text-blue-500 text-2xl font-bold">
          {stats.totalGames > 0 ? `${((stats.wins / stats.totalGames) * 100).toFixed(1)}%` : '0%'}
        </p>
      </div>
    </div>
  </div>
);

// Main App Component
function App() {
  const [deck, setDeck] = useState([]);
  const [stage, setStage] = useState(-1);
  const [currentPayout, setCurrentPayout] = useState(1);
  const [drawnCards, setDrawnCards] = useState([]);
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [currentBet, setCurrentBet] = useState(10);
  const [stats, setStats] = useState({
    wins: 0,
    losses: 0,
    highestWin: 0,
    totalGames: 0
  });
  const [showStats, setShowStats] = useState(false);
  const [isGuessing, setIsGuessing] = useState(false);
  const [resultMessage, setResultMessage] = useState('');

  useEffect(() => {
    resetGame();
  }, []);

  // Calculate odds for each stage
  const calculateOdds = (stage, currentCard) => {
    switch (stage) {
      case 0: // Red/Black
        return { R: 0.5, B: 0.5 };
      case 1: // Higher/Lower
        const remainingCards = deck.length;
        const higherCards = deck.filter(card => card.value > currentCard.value).length;
        const lowerCards = deck.filter(card => card.value < currentCard.value).length;
        return {
          H: higherCards / remainingCards,
          L: lowerCards / remainingCards
        };
      case 2: // In Between/Outside
        const [min, max] = [drawnCards[0].value, drawnCards[1].value].sort((a, b) => a - b);
        const betweenCards = deck.filter(card => card.value > min && card.value < max).length;
        const outsideCards = deck.filter(card => card.value <= min || card.value >= max).length;
        const total = betweenCards + outsideCards;
        return {
          I: betweenCards / total,
          O: outsideCards / total
        };
      case 3: // Suit
        return SUITS.reduce((acc, suit) => ({
          ...acc,
          [suit]: deck.filter(card => card.suit === suit).length / deck.length
        }), {});
      default:
        return {};
    }
  };

  // Calculate payout based on odds
  const calculatePayout = (odds) => {
    return Math.round((1 / odds) * 0.9 * 100) / 100; // House edge
  };

  // Deck manipulation functions
  const shuffle = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const createDeck = () => {
    const newDeck = [];
    for (const suit of SUITS) {
      for (const value of VALUES) {
        newDeck.push({ value, suit });
      }
    }
    return shuffle(newDeck);
  };

  const resetGame = () => {
    setDeck(createDeck());
    setStage(-1);
    setCurrentPayout(1);
    setDrawnCards([]);
    setIsGuessing(false);
    setResultMessage('');
  };

  const drawCard = () => {
    const newDeck = [...deck];
    const card = newDeck.pop();
    setDeck(newDeck);
    return card;
  };

  // Cashout function
  const handleCashout = () => {
    const winnings = currentBet * currentPayout;
    setBalance(prev => prev + winnings);
    updateStats(true, winnings);
    setResultMessage(`Cashed out for $${winnings.toFixed(2)}!`);
    setTimeout(() => {
      resetGame();
    }, REVEAL_DELAY);
  };

  // Handle guess logic
  const handleGuess = async (guess) => {
    if (isGuessing) return;
    setIsGuessing(true);

    const card = drawCard();
    
    // Check if the card has the same value as the last drawn card
    if (drawnCards.length > 0 && card.value === drawnCards[drawnCards.length - 1].value) {
      setDeck([...deck, card]); // Put the card back in the deck
      shuffle(deck);
      setResultMessage('Same value! Draw again...');
      setTimeout(() => {
        setIsGuessing(false);
        setResultMessage('');
      }, REVEAL_DELAY);
      return;
    }

    const newDrawnCards = [...drawnCards, card];
    setDrawnCards(newDrawnCards);

    let correct = false;
    const odds = calculateOdds(stage, drawnCards[drawnCards.length - 1]);
    
    switch (stage) {
      case 0:
        const isRed = card.suit === 'Hearts' || card.suit === 'Diamonds';
        correct = (guess === 'R' && isRed) || (guess === 'B' && !isRed);
        break;
      case 1:
        const prevValue = drawnCards[0].value;
        correct = (guess === 'H' && card.value > prevValue) || 
                 (guess === 'L' && card.value < prevValue);
        break;
      case 2:
        const [min, max] = [drawnCards[0].value, drawnCards[1].value].sort((a, b) => a - b);
        const isBetween = card.value > min && card.value < max;
        correct = (guess === 'I' && isBetween) || (guess === 'O' && !isBetween);
        break;
      case 3:
        correct = card.suit === guess;
        break;
    }

    if (correct) {
      const newPayout = currentPayout * calculatePayout(odds[guess]);
      setCurrentPayout(newPayout);
      setResultMessage(`Correct! Current payout: ${newPayout.toFixed(2)}x`);
      
      if (stage === 3) {
        const winnings = currentBet * newPayout;
        setBalance(prev => prev + winnings);
        updateStats(true, winnings);
        setTimeout(() => {
          resetGame();
        }, REVEAL_DELAY);
      } else {
        setTimeout(() => {
          setStage(stage + 1);
          setIsGuessing(false);
          setResultMessage('');
        }, REVEAL_DELAY);
      }
    } else {
      setResultMessage('Wrong! Better luck next time!');
      updateStats(false);
      setBalance(prev => prev - currentBet);
      setTimeout(() => {
        resetGame();
      }, REVEAL_DELAY);
    }
  };

  // Update stats
  const updateStats = (won, amount = 0) => {
    setStats(prev => ({
      wins: prev.wins + (won ? 1 : 0),
      losses: prev.losses + (won ? 0 : 1),
      highestWin: won ? Math.max(prev.highestWin, amount) : prev.highestWin,
      totalGames: prev.totalGames + 1
    }));
  };

  // Start game
  const startGame = () => {
    if (currentBet > balance) {
      alert('Your bet cannot exceed your balance!');
      return;
    }
    if (currentBet <= 0) {
      alert('Please enter a valid bet amount!');
      return;
    }
    setStage(0);
  };

  // Render game buttons based on stage
  const getStageButtons = () => {
    const odds = stage >= 0 && drawnCards.length > 0 ? calculateOdds(stage, drawnCards[drawnCards.length - 1]) : {};

    const renderButton = (label, action, colorClass, odds) => (
      <div className="flex flex-col items-center">
        <button
          onClick={action}
          disabled={isGuessing}
          className={`${colorClass} py-4 px-6 rounded-lg font-bold text-lg shadow-md hover:-translate-y-1 hover:shadow-lg transition-all duration-200 disabled:bg-gray-300 disabled:text-gray-500`}
        >
          {label}
        </button>
        {odds && (
          <p className="mt-2 text-sm text-gray-600">
            {(odds * 100).toFixed(1)}% ({calculatePayout(odds)}x)
          </p>
        )}
      </div>
    );

    switch (stage) {
      case 0:
        return (
          <div className="flex gap-6 justify-center mt-8">
            {renderButton('Red', () => handleGuess('R'), 'bg-red-500 text-white', odds.R)}
            {renderButton('Black', () => handleGuess('B'), 'bg-gray-800 text-white', odds.B)}
          </div>
        );
      case 1:
        return (
          <div className="flex gap-6 justify-center mt-8">
            {renderButton('Higher', () => handleGuess('H'), 'bg-blue-500 text-white', odds.H)}
            {renderButton('Lower', () => handleGuess('L'), 'bg-green-500 text-white', odds.L)}
          </div>
        );
      case 2:
        return (
          <div className="flex gap-6 justify-center mt-8">
            {renderButton('In Between', () => handleGuess('I'), 'bg-purple-500 text-white', odds.I)}
            {renderButton('Outside', () => handleGuess('O'), 'bg-orange-500 text-white', odds.O)}
          </div>
        );
      case 3:
        return (
          <div className="flex gap-4 justify-center flex-wrap mt-8">
            {SUITS.map(suit => renderButton(
              suit,
              () => handleGuess(suit),
              suit === 'Hearts' || suit === 'Diamonds' ? 'bg-red-500 text-white' : 'bg-gray-800 text-white',
              odds[suit]
            ))}
          </div>
        );
      default:
        return (
          <div className="flex flex-col gap-6 justify-center mt-8">
            <div className="relative">
              <input
                type="number"
                value={currentBet}
                onChange={(e) => setCurrentBet(Number(e.target.value))}
                className="w-full p-4 bg-white/90 rounded-lg shadow-sm border border-gray-200 text-lg"
                placeholder="Bet Amount"
              />
              <label className="absolute text-sm text-gray-500 -top-2 left-2 bg-white px-1">
                Bet Amount
              </label>
            </div>
            <button
              onClick={() => stage >= 0 ? handleCashout() : startGame()}
              className="bg-purple-600 hover:bg-purple-700 text-white py-4 px-8 rounded-lg font-bold text-xl shadow-lg hover:-translate-y-1 transition-all duration-200"
            >
              {stage >= 0 ? `Cashout ($${(currentBet * currentPayout).toFixed(2)})` : 'Start Game'}
            </button>
          </div>
        );
    }
  };

  // Main render
  return (
    <div className="flex flex-col items-center min-h-screen w-full p-8 bg-gradient-to-br from-purple-900 to-gray-900">
      <div className="w-full max-w-2xl mb-8 bg-white/90 backdrop-blur rounded-xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-3xl font-bold text-purple-800 text-center">
            Card Game
          </h1>
        </div>
        <div className="p-6">
          <div className="flex justify-between mb-6">
            <p className="text-xl font-bold text-blue-900">
              Balance: ${balance}
            </p>
            {stage >= 0 && (
              <div className="flex items-center gap-4">
                <p className="text-lg text-purple-600">
                  Stage: {stage + 1}
                </p>
                {stage > 0 && (
                  <p className="text-lg text-green-600">
                    Current Payout: {currentPayout.toFixed(2)}x
                  </p>
                )}
              </div>
            )}
          </div>
          {resultMessage && (
            <p className={`text-xl text-center my-4 font-bold ${
              resultMessage.includes('Correct') || resultMessage.includes('Cashed') 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {resultMessage}
            </p>
          )}
          <div className="relative w-full h-48 mb-8 flex justify-center">
            {drawnCards.map((card, index) => (
              <PlayingCard key={index} card={card} position={index} />
            ))}
          </div>
          {getStageButtons()}
          <button 
            onClick={() => setShowStats(!showStats)}
            className="mt-6 text-purple-600 hover:bg-purple-50 w-full py-2 rounded-lg transition-colors"
          >
            {showStats ? 'Hide Stats' : 'Show Stats'}
          </button>
        </div>
      </div>
      {showStats && <StatsDisplay stats={stats} />}
    </div>
  );
}

export default App;
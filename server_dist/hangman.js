"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const entries = [
    'KAPUSTA I KWAS',
    'programowanie',
    'hemoglobina',
    'lekkoatletyka',
    'interpunkcja',
    'telekomunikacja',
    'metamorfoza',
    'urwiesz mi od internetu',
    'zwierzchnictwo',
    'prześladowanie',
    'antyterrorysta',
    'dźwiękonaśladownictwo',
    'antykoncepcja',
    'kolorowanka',
    'luminescencja',
    'onomatopeja',
    'aksjomat',
    'prawdopodobieństwo',
    'magnetoelektryczny',
    'malkontenctwo',
    'primaaprilisowy',
    'pięćdziesięciogroszówka',
    'anatomopatologiczny',
    'deoksyrybonukleinowy',
];
class HangmanClass {
    constructor() {
        this.guesses_history = new Set();
        this.target_entry = entries[(Math.random() * entries.length) | 0].toUpperCase();
        this.user_guess = this.target_entry.replace(/[A-Z]/gi, '-');
        this.remaining_tries = 8;
    }
    getAnswer() {
        return this.target_entry;
    }
    getUserGuess() {
        return this.user_guess;
    }
    getRemainingTries() {
        return this.remaining_tries;
    }
    tryAnswerOrLetter(input) {
        if (input.replace(/[^a-z ]/gi, '') !== input)
            return HangmanClass.RESULT.wrong_input;
        input = input.toUpperCase();
        if (this.guesses_history.has(input))
            return HangmanClass.RESULT.repeated_guess;
        this.guesses_history.add(input);
        if (input.length === 1) { //single letter guess
            if (this.user_guess.indexOf(input) !== -1)
                return HangmanClass.RESULT.repeated_guess; //should never occur
            else {
                let guess_index = this.target_entry.indexOf(input);
                if (guess_index === -1) {
                    this.remaining_tries--;
                    return HangmanClass.RESULT.wrong_guess;
                }
                else {
                    let arr = this.user_guess.split('');
                    for (var i = 0; i < this.target_entry.length; i++) {
                        if (this.target_entry[i] === input)
                            arr[i] = input;
                    }
                    this.user_guess = arr.join('');
                    if (this.user_guess === this.target_entry)
                        return HangmanClass.RESULT.solved;
                    return HangmanClass.RESULT.letter_guessed;
                }
            }
        }
        else { //full guess
            if (this.target_entry === input) {
                this.user_guess = this.target_entry;
                return HangmanClass.RESULT.solved;
            }
            this.remaining_tries--;
            return HangmanClass.RESULT.wrong_guess;
        }
    }
}
HangmanClass.RESULT = {
    letter_guessed: 0,
    wrong_guess: 1,
    solved: 2,
    repeated_guess: 3,
    wrong_input: 4
};
exports.default = HangmanClass;

export interface SrsCard {
    interval: number;
    repetitions: number;
    easeFactor: number;
    dueDate: string; // YYYY-MM-DD
}

export function createNewCard(): SrsCard {
    return {
        interval: 1,
        repetitions: 0,
        easeFactor: 2.5,
        dueDate: new Date().toISOString().split('T')[0]
    };
}

export function updateSm2(card: SrsCard, quality: number): SrsCard {
    const q = Math.max(0, Math.min(5, quality));
    let { interval, repetitions, easeFactor } = card;

    easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));

    if (q >= 3) {
        interval = repetitions === 0 ? 1 : repetitions === 1 ? 6 : Math.round(interval * easeFactor);
        repetitions++;
    } else {
        interval = 1;
        repetitions = 0;
    }

    const due = new Date();
    due.setDate(due.getDate() + interval);

    return {
        interval,
        repetitions,
        easeFactor,
        dueDate: due.toISOString().split('T')[0]
    };
}

export function isDue(card: SrsCard): boolean {
    return card.dueDate <= new Date().toISOString().split('T')[0];
}

export type AnswerInput = {
  questionId: string;
  answer: number | null;
  importance: number;
  skipped: boolean;
};

export type QuestionWithPartyPositions = {
  id: string;
  topic: string;
  questionText: string;
  positions: Array<{
    partyId: string;
    positionValue: number;
    sourceUrl: string;
    sourceQuote: string;
    summary: string;
  }>;
};

export type TopicScore = {
  topic: string;
  matchPercent: number;
  questionsMatched: number;
};

export type PartyScore = {
  partyId: string;
  matchPercent: number;
  questionsMatched: number;
  questionsMissing: number;
  questionsSkipped: number;
  topicBreakdown: TopicScore[];
  closeQuestions: Array<{ questionId: string; questionText: string; diff: number }>;
  farQuestions: Array<{ questionId: string; questionText: string; diff: number }>;
};

export function scoreAnswers(
  answers: AnswerInput[],
  questions: QuestionWithPartyPositions[]
): PartyScore[] {
  const partyIds = [
    ...new Set(questions.flatMap((q) => q.positions.map((p) => p.partyId))),
  ];

  const answerMap = new Map(answers.map((a) => [a.questionId, a]));

  return partyIds.map((partyId) => {
    let totalScore = 0;
    let maxPossible = 0;
    let questionsMatched = 0;
    let questionsMissing = 0;
    let questionsSkipped = 0;

    const topicMap = new Map<string, { score: number; max: number; count: number }>();
    const questionDiffs: Array<{ questionId: string; questionText: string; diff: number }> = [];

    for (const question of questions) {
      const userAnswer = answerMap.get(question.id);
      if (!userAnswer || userAnswer.skipped || userAnswer.answer === null) {
        questionsSkipped++;
        continue;
      }

      const partyPosition = question.positions.find((p) => p.partyId === partyId);
      if (!partyPosition) {
        questionsMissing++;
        continue;
      }

      const diff = Math.abs(userAnswer.answer - partyPosition.positionValue);
      const score = (4 - diff) * userAnswer.importance;
      const max = 4 * userAnswer.importance;

      totalScore += score;
      maxPossible += max;
      questionsMatched++;

      questionDiffs.push({ questionId: question.id, questionText: question.questionText, diff });

      const topicEntry = topicMap.get(question.topic) ?? { score: 0, max: 0, count: 0 };
      topicEntry.score += score;
      topicEntry.max += max;
      topicEntry.count++;
      topicMap.set(question.topic, topicEntry);
    }

    const matchPercent = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0;

    const topicBreakdown: TopicScore[] = [...topicMap.entries()].map(([topic, data]) => ({
      topic,
      matchPercent: data.max > 0 ? Math.round((data.score / data.max) * 100) : 0,
      questionsMatched: data.count,
    }));

    const sorted = [...questionDiffs].sort((a, b) => a.diff - b.diff);
    const closeQuestions = sorted.slice(0, 3);
    const farQuestions = sorted.slice(-3).reverse();

    return {
      partyId,
      matchPercent,
      questionsMatched,
      questionsMissing,
      questionsSkipped,
      topicBreakdown,
      closeQuestions,
      farQuestions,
    };
  }).sort((a, b) => b.matchPercent - a.matchPercent);
}

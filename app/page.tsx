'use client';

import { Check, Gift, Heart, PartyPopper, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';

type Answer = 'yes' | 'no';

type Question = {
  title: string;
  imageLabel: string;
  imageHint: string;
  yesReaction: string;
  noReaction: string;
};

type ModelContextTool = {
  name: string;
  title: string;
  description: string;
  inputSchema: object;
  annotations?: {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
  };
  execute(input: unknown): unknown;
};

declare global {
  interface Document {
    modelContext?: {
      registerTool(
        tool: ModelContextTool,
        options?: { signal?: AbortSignal },
      ): void | Promise<void>;
    };
  }
}

const questions: Question[] = [
  {
    title: 'Você é mãe dessas duas coisas lindas?',
    imageLabel: 'Foto dos filhos',
    imageHint: 'Coloque a foto em public/images/filhos.jpg',
    yesReaction: 'Resposta aceita. O amor de mãe entregou tudo.',
    noReaction: 'Hmm... vamos fingir que foi erro de clique.',
  },
  {
    title: 'Você é casada com esse galã?',
    imageLabel: 'Foto do casal',
    imageHint: 'Coloque a foto em public/images/casal.jpeg',
    yesReaction: 'Confirmado: casal oficial da celebração.',
    noReaction: 'Negar esse galã em público? Audacioso.',
  },
  {
    title: 'Você é essa mulher maravilhosa da foto?',
    imageLabel: 'Foto da Wilma',
    imageHint: 'Coloque a foto em public/images/wilma.jpeg',
    yesReaction: 'Sem dúvidas. Elegância reconhecida.',
    noReaction: 'O sistema detectou modéstia em excesso.',
  },
  {
    title: 'Você é sogra desse bonitão?',
    imageLabel: 'Foto do genro',
    imageHint: 'Coloque a foto em public/images/genro.jpg',
    yesReaction: 'Confirmado: sogra de respeito e genro aprovado.',
    noReaction: 'Negar esse bonitão? O júri pede revisão.',
  },
  {
    title: 'Você está fazendo aniversário hoje?',
    imageLabel: 'Aniversário da Wilma',
    imageHint: 'Coloque a foto em public/images/aniversario.jpeg',
    yesReaction: 'Agora sim. Pode preparar o sorriso.',
    noReaction: 'Hoje é sim. O calendário está do nosso lado.',
  },
];

const imagePaths = [
  '/images/filhos.jpg',
  '/images/casal.jpeg',
  '/images/wilma.jpeg',
  '/images/genro.jpg',
  '/images/aniversario.jpeg',
];

export default function Home() {
  const [step, setStep] = useState(0);
  const [lastReaction, setLastReaction] = useState(
    'Responda com calma. A auditoria de aniversário é séria.',
  );
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [pixRevealed, setPixRevealed] = useState(false);

  const isFinal = step >= questions.length;
  const currentQuestion = questions[step];
  const progress = useMemo(
    () => Math.min((step / questions.length) * 100, 100),
    [step],
  );

  function answerQuestion(answer: Answer) {
    if (!currentQuestion) {
      return;
    }

    setAnswers((previous) => [...previous, answer]);
    setLastReaction(
      answer === 'yes' ? currentQuestion.yesReaction : currentQuestion.noReaction,
    );
    setStep((previous) => previous + 1);
  }

  function revealPix() {
    setPixRevealed(true);
  }

  useEffect(() => {
    const context = document.modelContext;

    if (!context?.registerTool) {
      return;
    }

    const lifecycle = new AbortController();
    const register = (tool: ModelContextTool) => {
      try {
        void Promise.resolve(
          context.registerTool(tool, { signal: lifecycle.signal }),
        ).catch(() => undefined);
      } catch {
        // WebMCP is optional browser functionality; the visible quiz still works.
      }
    };

    register({
      name: 'get_birthday_quiz_state',
      title: 'Get birthday quiz state',
      description: 'Read the current Wilma birthday quiz step and progress.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute() {
        return {
          step,
          totalQuestions: questions.length,
          isFinal,
          currentQuestion: currentQuestion?.title ?? null,
          lastReaction,
          answers,
          pixRevealed,
        };
      },
    });

    register({
      name: 'answer_birthday_question',
      title: 'Answer birthday question',
      description:
        'Answer the current Wilma birthday quiz question with yes or no.',
      inputSchema: {
        type: 'object',
        properties: {
          answer: { type: 'string', enum: ['yes', 'no'] },
        },
        required: ['answer'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        if (
          typeof input !== 'object' ||
          input === null ||
          !('answer' in input) ||
          (input.answer !== 'yes' && input.answer !== 'no')
        ) {
          throw new Error('answer must be yes or no');
        }

        if (isFinal) {
          return {
            step,
            totalQuestions: questions.length,
            isFinal: true,
            message: 'Quiz already finished.',
          };
        }

        answerQuestion(input.answer);

        return {
          answered: input.answer,
          nextStep: step + 1,
          totalQuestions: questions.length,
          isFinal: step + 1 >= questions.length,
        };
      },
    });

    register({
      name: 'reveal_birthday_pix',
      title: 'Reveal birthday Pix',
      description: 'Reveal the R$ 800,00 birthday Pix prize on the final screen.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute() {
        if (!isFinal) {
          throw new Error('Pix can only be revealed after the quiz is finished.');
        }

        revealPix();

        return {
          pixRevealed: true,
          prize: 'R$ 800,00',
        };
      },
    });

    return () => lifecycle.abort();
  }, [answers, currentQuestion, isFinal, lastReaction, pixRevealed, step]);

  return (
    <main className="min-h-[100svh] overflow-hidden bg-[radial-gradient(circle_at_top_left,#ffe7ea_0,#fff9f4_34%,#f4fbff_68%,#fff_100%)] text-zinc-950">
      <div className="pointer-events-none fixed inset-0 opacity-70">
        <span className="confetti confetti-1" />
        <span className="confetti confetti-2" />
        <span className="confetti confetti-3" />
        <span className="confetti confetti-4" />
        <span className="confetti confetti-5" />
        <span className="confetti confetti-6" />
      </div>

      <section className="relative mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col px-4 py-3 sm:px-8 sm:py-6 lg:px-10">
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-200 sm:size-11">
              <PartyPopper className="size-4 sm:size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-rose-700 sm:text-sm">
                Missão Wilma
              </p>
              <h1 className="truncate text-base font-bold tracking-normal sm:text-2xl">
                Confirmação de aniversário
              </h1>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-rose-200 bg-white/75 px-4 py-2 text-sm font-semibold text-rose-800 shadow-sm backdrop-blur sm:flex">
            <Sparkles className="size-4" aria-hidden="true" />
            {isFinal ? 'Final liberado' : `${step + 1} de ${questions.length}`}
          </div>
        </header>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/70 shadow-inner sm:mt-6 sm:h-2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-sky-500 transition-all duration-500"
            style={{ width: `${isFinal ? 100 : progress}%` }}
          />
        </div>

        <div className="grid flex-1 content-center gap-3 py-3 sm:gap-8 sm:py-8 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-center lg:py-10">
          <section className="order-2 lg:order-1">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 sm:mb-5 sm:px-4 sm:py-2 sm:text-sm">
              <Heart className="size-3.5 fill-current sm:size-4" aria-hidden="true" />
              Tudo indica que hoje tem festa
            </div>

            {isFinal ? (
              <Finale
                answers={answers}
                onRevealPix={revealPix}
                pixRevealed={pixRevealed}
              />
            ) : (
              <div className="max-w-2xl">
                <p className="mb-1.5 text-sm font-semibold text-sky-800 sm:mb-3 sm:text-base">
                  Pergunta {step + 1}
                </p>
                <h2 className="text-[clamp(1.85rem,8.5vw,2.45rem)] font-black leading-[1.03] tracking-normal text-zinc-950 sm:text-5xl">
                  {currentQuestion.title}
                </h2>
                <p className="mt-2 line-clamp-2 max-w-xl text-sm font-medium leading-6 text-zinc-700 sm:mt-5 sm:text-lg sm:leading-8">
                  {lastReaction}
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2.5 sm:mt-8 sm:gap-3">
                  <Button
                    className="h-12 rounded-2xl bg-rose-600 text-base font-bold text-white shadow-lg shadow-rose-200 hover:bg-rose-700 sm:h-14"
                    onClick={() => answerQuestion('yes')}
                  >
                    <Check className="size-5" aria-hidden="true" />
                    Sim
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 rounded-2xl border-2 border-zinc-200 bg-white/80 text-base font-bold text-zinc-800 shadow-sm hover:bg-sky-50 sm:h-14"
                    onClick={() => answerQuestion('no')}
                  >
                    <X className="size-5" aria-hidden="true" />
                    Não
                  </Button>
                </div>
              </div>
            )}
          </section>

          <section className="order-1 lg:order-2">
            <PhotoFrame
              finalMode={isFinal}
              imageHint={currentQuestion?.imageHint}
              imageLabel={currentQuestion?.imageLabel ?? 'Wilma'}
              src={imagePaths[step]}
            />
          </section>
        </div>
      </section>
    </main>
  );
}

function PhotoFrame({
  finalMode,
  imageHint,
  imageLabel,
  src,
}: {
  finalMode: boolean;
  imageHint?: string;
  imageLabel: string;
  src?: string;
}) {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const imageFailed = src ? failedImages[src] : true;

  return (
    <div className="relative mx-auto aspect-[4/3] h-[min(37svh,310px)] w-full max-w-[430px] overflow-hidden rounded-[1.4rem] border border-white/70 bg-white/75 p-2 shadow-2xl shadow-rose-100 backdrop-blur sm:aspect-[4/5] sm:h-auto sm:rounded-[2rem] sm:p-3">
      <div className="relative flex h-full overflow-hidden rounded-[1rem] bg-gradient-to-br from-rose-100 via-amber-50 to-sky-100 sm:rounded-[1.5rem]">
        {src && !imageFailed ? (
          <img
            alt={imageLabel}
            className="h-full w-full object-cover"
            onError={() =>
              setFailedImages((previous) => ({ ...previous, [src]: true }))
            }
            src={src}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center p-5 text-center sm:p-8">
            <div className="mb-3 flex size-16 items-center justify-center rounded-full bg-white text-rose-600 shadow-lg sm:mb-5 sm:size-24">
              {finalMode ? (
                <Gift className="size-8 sm:size-11" aria-hidden="true" />
              ) : (
                <Heart className="size-8 fill-current sm:size-11" aria-hidden="true" />
              )}
            </div>
            <p className="text-xl font-black tracking-normal text-zinc-950 sm:text-2xl">
              {finalMode ? 'Wilma' : imageLabel}
            </p>
            <p className="mt-2 max-w-64 text-xs font-medium leading-5 text-zinc-600 sm:mt-3 sm:text-sm sm:leading-6">
              {finalMode
                ? 'Te desejamos um excelente aniversário.'
                : imageHint}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Finale({
  answers,
  onRevealPix,
  pixRevealed,
}: {
  answers: Answer[];
  onRevealPix: () => void;
  pixRevealed: boolean;
}) {
  const yesCount = answers.filter((answer) => answer === 'yes').length;

  return (
    <div className="max-w-2xl">
      <p className="mb-1.5 text-sm font-semibold text-rose-700 sm:mb-3 sm:text-base">
        Resultado oficial
      </p>
      <h2 className="text-[clamp(2rem,9vw,2.7rem)] font-black leading-[1.03] tracking-normal text-zinc-950 sm:text-6xl">
        Parabéns, Wilma!
      </h2>
      <p className="mt-2 line-clamp-3 text-sm font-medium leading-6 text-zinc-700 sm:mt-5 sm:text-lg sm:leading-8">
        A investigação terminou com {yesCount} respostas positivas, muito amor
        envolvido e uma conclusão inevitável: hoje é dia de celebrar você.
      </p>

      <div className="mt-3 rounded-[1.25rem] border border-rose-200 bg-white/80 p-4 shadow-xl shadow-rose-100 backdrop-blur sm:mt-7 sm:rounded-[1.5rem] sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white sm:size-12">
            <Gift className="size-5 sm:size-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-rose-700 sm:text-sm">
              Alerta de presente
            </p>
            <p className="mt-1 text-xl font-black tracking-normal text-zinc-950 sm:text-2xl">
              Seu PIX gigante está pronto.
            </p>
            <p className="mt-1.5 text-sm leading-6 text-zinc-600 sm:mt-2 sm:text-base sm:leading-7">
              Falta só apertar o botão mais importante da festa.
            </p>
          </div>
        </div>
      </div>

      {!pixRevealed ? (
        <Button
          className="pix-button mt-3 h-12 w-full rounded-2xl bg-zinc-950 px-6 text-base font-black text-white hover:bg-zinc-800 sm:mt-7 sm:h-14 sm:w-auto"
          onClick={onRevealPix}
        >
          <Sparkles className="size-5" aria-hidden="true" />
          RECEBER PIX
        </Button>
      ) : (
        <div className="pix-prize mt-3 rounded-[1.25rem] border-2 border-amber-300 bg-amber-50 px-5 py-4 text-center shadow-2xl shadow-amber-200 sm:mt-7 sm:inline-block sm:px-8 sm:py-5">
          <p className="text-sm font-black uppercase text-amber-800">
            PIX gigante liberado
          </p>
          <p className="text-[clamp(2.25rem,12vw,4.75rem)] font-black leading-none tracking-normal text-rose-700">
            R$ 800,00
          </p>
          <p className="mt-2 text-sm font-bold text-zinc-700 sm:text-base">
            Presente aprovado para a aniversariante!
          </p>
        </div>
      )}
    </div>
  );
}

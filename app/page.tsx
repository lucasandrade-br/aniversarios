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
    title: 'Voce e mae dessas duas coisas lindas?',
    imageLabel: 'Foto dos filhos',
    imageHint: 'Coloque a foto em public/images/filhos.jpg',
    yesReaction: 'Resposta aceita. O amor de mae entregou tudo.',
    noReaction: 'Hmm... vamos fingir que foi erro de clique.',
  },
  {
    title: 'Voce e casada com esse gala?',
    imageLabel: 'Foto do casal',
    imageHint: 'Coloque a foto em public/images/casal.jpg',
    yesReaction: 'Confirmado: casal oficial da celebracao.',
    noReaction: 'Negar esse gala em publico? Audacioso.',
  },
  {
    title: 'Voce e essa mulher maravilhosa da foto?',
    imageLabel: 'Foto da Wilma',
    imageHint: 'Coloque a foto em public/images/wilma.jpg',
    yesReaction: 'Sem duvidas. Elegancia reconhecida.',
    noReaction: 'O sistema detectou modestia em excesso.',
  },
  {
    title: 'Voce deixa qualquer lugar mais alegre so de chegar?',
    imageLabel: 'Momento especial',
    imageHint: 'Coloque a foto em public/images/momento.jpg',
    yesReaction: 'Exatamente. Energia boa validada com sucesso.',
    noReaction: 'Discordancia registrada, mas ignorada com carinho.',
  },
  {
    title: 'Voce esta fazendo aniversario hoje?',
    imageLabel: 'Aniversario da Wilma',
    imageHint: 'Coloque a foto em public/images/aniversario.jpg',
    yesReaction: 'Agora sim. Pode preparar o sorriso.',
    noReaction: 'Hoje e sim. O calendario esta do nosso lado.',
  },
];

const imagePaths = [
  '/images/filhos.jpg',
  '/images/casal.jpg',
  '/images/wilma.jpg',
  '/images/momento.jpg',
  '/images/aniversario.jpg',
];

export default function Home() {
  const [step, setStep] = useState(0);
  const [lastReaction, setLastReaction] = useState(
    'Responda com calma. A auditoria de aniversario e seria.',
  );
  const [answers, setAnswers] = useState<Answer[]>([]);

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

  function restart() {
    setStep(0);
    setAnswers([]);
    setLastReaction('Responda com calma. A auditoria de aniversario e seria.');
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
      name: 'restart_birthday_quiz',
      title: 'Restart birthday quiz',
      description: 'Return the Wilma birthday quiz to the first question.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute() {
        restart();

        return {
          step: 0,
          totalQuestions: questions.length,
          isFinal: false,
        };
      },
    });

    return () => lifecycle.abort();
  }, [answers, currentQuestion, isFinal, lastReaction, step]);

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#ffe7ea_0,#fff9f4_34%,#f4fbff_68%,#fff_100%)] text-zinc-950">
      <div className="pointer-events-none fixed inset-0 opacity-70">
        <span className="confetti confetti-1" />
        <span className="confetti confetti-2" />
        <span className="confetti confetti-3" />
        <span className="confetti confetti-4" />
        <span className="confetti confetti-5" />
        <span className="confetti confetti-6" />
      </div>

      <section className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-200">
              <PartyPopper className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase text-rose-700">
                Missao Wilma
              </p>
              <h1 className="text-xl font-bold tracking-normal sm:text-2xl">
                Confirmacao de aniversario
              </h1>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-rose-200 bg-white/75 px-4 py-2 text-sm font-semibold text-rose-800 shadow-sm backdrop-blur sm:flex">
            <Sparkles className="size-4" aria-hidden="true" />
            {isFinal ? 'Final liberado' : `${step + 1} de ${questions.length}`}
          </div>
        </header>

        <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/70 shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-sky-500 transition-all duration-500"
            style={{ width: `${isFinal ? 100 : progress}%` }}
          />
        </div>

        <div className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_430px] lg:py-10">
          <section className="order-2 lg:order-1">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900">
              <Heart className="size-4 fill-current" aria-hidden="true" />
              Tudo indica que hoje tem festa
            </div>

            {isFinal ? (
              <Finale answers={answers} onRestart={restart} />
            ) : (
              <div className="max-w-2xl">
                <p className="mb-3 text-base font-semibold text-sky-800">
                  Pergunta {step + 1}
                </p>
                <h2 className="text-4xl font-black leading-tight tracking-normal text-zinc-950 sm:text-5xl">
                  {currentQuestion.title}
                </h2>
                <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-700">
                  {lastReaction}
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  <Button
                    className="h-14 rounded-2xl bg-rose-600 text-base font-bold text-white shadow-lg shadow-rose-200 hover:bg-rose-700"
                    onClick={() => answerQuestion('yes')}
                  >
                    <Check className="size-5" aria-hidden="true" />
                    Sim
                  </Button>
                  <Button
                    variant="outline"
                    className="h-14 rounded-2xl border-2 border-zinc-200 bg-white/80 text-base font-bold text-zinc-800 shadow-sm hover:bg-sky-50"
                    onClick={() => answerQuestion('no')}
                  >
                    <X className="size-5" aria-hidden="true" />
                    Nao
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
    <div className="relative mx-auto aspect-[4/5] w-full max-w-[430px] overflow-hidden rounded-[2rem] border border-white/70 bg-white/75 p-3 shadow-2xl shadow-rose-100 backdrop-blur">
      <div className="relative flex h-full overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-rose-100 via-amber-50 to-sky-100">
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
          <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
            <div className="mb-5 flex size-24 items-center justify-center rounded-full bg-white text-rose-600 shadow-lg">
              {finalMode ? (
                <Gift className="size-11" aria-hidden="true" />
              ) : (
                <Heart className="size-11 fill-current" aria-hidden="true" />
              )}
            </div>
            <p className="text-2xl font-black tracking-normal text-zinc-950">
              {finalMode ? 'Wilma' : imageLabel}
            </p>
            <p className="mt-3 max-w-64 text-sm font-medium leading-6 text-zinc-600">
              {finalMode
                ? 'Tela final pronta para receber a melhor foto da aniversariante.'
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
  onRestart,
}: {
  answers: Answer[];
  onRestart: () => void;
}) {
  const yesCount = answers.filter((answer) => answer === 'yes').length;

  return (
    <div className="max-w-2xl">
      <p className="mb-3 text-base font-semibold text-rose-700">
        Resultado oficial
      </p>
      <h2 className="text-4xl font-black leading-tight tracking-normal text-zinc-950 sm:text-6xl">
        Parabens, Wilma!
      </h2>
      <p className="mt-5 text-lg leading-8 text-zinc-700">
        A investigacao terminou com {yesCount} respostas positivas, muito amor
        envolvido e uma conclusao inevitavel: hoje e dia de celebrar voce.
      </p>

      <div className="mt-7 rounded-[1.5rem] border border-rose-200 bg-white/80 p-5 shadow-xl shadow-rose-100 backdrop-blur">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white">
            <Gift className="size-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-bold uppercase text-rose-700">
              Alerta de presente
            </p>
            <p className="mt-1 text-2xl font-black tracking-normal text-zinc-950">
              Voce vai receber um PIX gigante.
            </p>
            <p className="mt-2 text-base leading-7 text-zinc-600">
              O tamanho exato esta em analise, mas a intencao ja foi aprovada
              por unanimidade.
            </p>
          </div>
        </div>
      </div>

      <Button
        className="mt-7 h-12 rounded-2xl bg-zinc-950 px-6 text-base font-bold text-white hover:bg-zinc-800"
        onClick={onRestart}
      >
        <PartyPopper className="size-5" aria-hidden="true" />
        Rever a surpresa
      </Button>
    </div>
  );
}

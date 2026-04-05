import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { SkillTest } from '@/lib/models/skill-test.model';
import mongoose from 'mongoose';

export async function GET() {
  try {
    await connectDB();

    // Check if we already have tests
    const existingCount = await SkillTest.countDocuments();
    if (existingCount > 0) {
      return NextResponse.json({ message: 'Skill tests already seeded', count: existingCount });
    }

    const seedTests = [
      {
        title: 'React Fundamentals',
        skill: 'React',
        description: 'Test your knowledge on React hooks, state management, and component lifecycle.',
        difficulty: 'intermediate',
        durationMinutes: 10,
        passingScore: 70,
        questions: [
          {
            question: 'Which hook should be used to perform side effects in a function component?',
            options: ['useState', 'useEffect', 'useContext', 'useReducer'],
            correctOptionIndex: 1,
            points: 10,
          },
          {
            question: 'What is the purpose of the key prop in a list of elements?',
            options: [
              'To bind data to the element',
              'To uniquely identify elements for efficient DOM updates',
              'To define the CSS class of the element',
              'To pass arguments to event handlers'
            ],
            correctOptionIndex: 1,
            points: 10,
          },
          {
            question: 'How do you pass data from a child to a parent component?',
            options: [
              'Using context',
              'Passing a callback function as a prop',
              'Using Redux',
              'Using refs'
            ],
            correctOptionIndex: 1,
            points: 10,
          }
        ]
      },
      {
        title: 'JavaScript Basics',
        skill: 'JavaScript',
        description: 'Assess your foundational understanding of JavaScript concepts like closures, promises, and scoping.',
        difficulty: 'beginner',
        durationMinutes: 5,
        passingScore: 60,
        questions: [
          {
            question: 'What is the output of typeof null?',
            options: ['"null"', '"undefined"', '"object"', '"boolean"'],
            correctOptionIndex: 2,
            points: 10,
          },
          {
            question: 'Which keyword declare a block-scoped variable?',
            options: ['var', 'let', 'function', 'global'],
            correctOptionIndex: 1,
            points: 10,
          }
        ]
      },
      {
        title: 'Backend Node.js API',
        skill: 'Node.js',
        description: 'Advanced assessment for Node.js backend development.',
        difficulty: 'advanced',
        durationMinutes: 15,
        passingScore: 80,
        questions: [
          {
            question: 'Which method is used to hash passwords securely?',
            options: ['md5', 'base64', 'bcrypt', 'sha1'],
            correctOptionIndex: 2,
            points: 15,
          },
          {
            question: 'In Express, how do you correctly terminate a request-response cycle?',
            options: ['res.send()', 'req.close()', 'next()', 'return false'],
            correctOptionIndex: 0,
            points: 15,
          }
        ]
      }
    ];

    await SkillTest.insertMany(seedTests);

    return NextResponse.json({ message: 'Skill tests seeded successfully', count: seedTests.length });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Failed to seed skill tests' }, { status: 500 });
  }
}

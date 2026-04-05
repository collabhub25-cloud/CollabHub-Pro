import dotenv from 'dotenv';
import path from 'path';
import { connectDB } from '../src/lib/mongodb';
import { SkillTest } from '../src/lib/models/skill-test.model';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const tests = [
  {
    title: 'JavaScript Fundamentals',
    skill: 'javascript',
    description: 'Test your knowledge of JavaScript core concepts including closures, prototypes, async/await, and ES6+ features.',
    difficulty: 'beginner',
    durationMinutes: 15,
    passingScore: 70,
    isActive: true,
    questions: [
      { question: 'What is the output of: typeof null?', options: ['"null"', '"undefined"', '"object"', '"boolean"'], correctOptionIndex: 2, points: 1 },
      { question: 'Which method creates a new array with the results of calling a function on every element?', options: ['forEach()', 'map()', 'filter()', 'reduce()'], correctOptionIndex: 1, points: 1 },
      { question: 'What does the "===" operator check?', options: ['Value only', 'Type only', 'Value and type', 'Reference only'], correctOptionIndex: 2, points: 1 },
      { question: 'What is a closure in JavaScript?', options: ['A way to close a browser window', 'A function that has access to variables from its outer scope', 'A method to terminate a loop', 'A type of error handling'], correctOptionIndex: 1, points: 2 },
      { question: 'What does Promise.all() return if one promise rejects?', options: ['An array with null for the rejected promise', 'The result of the first resolved promise', 'It rejects with the reason of the first rejected promise', 'An empty array'], correctOptionIndex: 2, points: 2 },
      { question: 'Which keyword declares a block-scoped variable?', options: ['var', 'let', 'const', 'Both let and const'], correctOptionIndex: 3, points: 1 },
      { question: 'What is the output of: console.log(0.1 + 0.2 === 0.3)?', options: ['true', 'false', 'undefined', 'NaN'], correctOptionIndex: 1, points: 2 },
      { question: 'What does the spread operator (...) do?', options: ['Spreads elements of an iterable into individual elements', 'Creates a deep copy of an object', 'Removes duplicate values', 'Concatenates strings'], correctOptionIndex: 0, points: 1 },
    ],
  },
  {
    title: 'React Essentials',
    skill: 'react',
    description: 'Evaluate your understanding of React hooks, component lifecycle, state management, and best practices.',
    difficulty: 'intermediate',
    durationMinutes: 20,
    passingScore: 70,
    isActive: true,
    questions: [
      { question: 'When does useEffect with an empty dependency array ([]) run?', options: ['On every render', 'Only on mount and unmount', 'Only on mount', 'Never'], correctOptionIndex: 1, points: 1 },
      { question: 'What is the primary purpose of React.memo()?', options: ['To memoize expensive calculations', 'To prevent unnecessary re-renders of a component', 'To cache API responses', 'To store values in local storage'], correctOptionIndex: 1, points: 2 },
      { question: 'Which Hook should you use for expensive computations?', options: ['useEffect', 'useState', 'useMemo', 'useCallback'], correctOptionIndex: 2, points: 1 },
      { question: 'What problem does the React key prop solve in lists?', options: ['Styling list items', 'Helping React identify which items changed', 'Sorting the list', 'Filtering duplicates'], correctOptionIndex: 1, points: 1 },
      { question: 'What is a controlled component in React?', options: ['A component that controls other components', 'A form element whose value is controlled by React state', 'A component with access control', 'A component wrapped in an error boundary'], correctOptionIndex: 1, points: 2 },
      { question: 'What happens when you call useState setter with the same value?', options: ['The component always re-renders', 'React bails out of the re-render', 'An error is thrown', 'The state is set to undefined'], correctOptionIndex: 1, points: 2 },
      { question: 'Which pattern is used to share logic between components?', options: ['Inheritance', 'Custom Hooks', 'Global variables', 'Mixins'], correctOptionIndex: 1, points: 1 },
      { question: 'What is the virtual DOM?', options: ['A browser API', 'A lightweight JS copy of the real DOM for diffing', 'A CSS rendering engine', 'A test utility'], correctOptionIndex: 1, points: 1 },
    ],
  },
  {
    title: 'Node.js & Backend',
    skill: 'nodejs',
    description: 'Test your backend development knowledge covering Node.js runtime, APIs, and server-side concepts.',
    difficulty: 'intermediate',
    durationMinutes: 20,
    passingScore: 70,
    isActive: true,
    questions: [
      { question: 'What is the event loop in Node.js?', options: ['A loop that processes UI events', 'A mechanism that handles async I/O operations', 'A for-loop that processes events sequentially', 'A timer that runs every second'], correctOptionIndex: 1, points: 2 },
      { question: 'What HTTP status code for a successfully created resource?', options: ['200', '201', '204', '301'], correctOptionIndex: 1, points: 1 },
      { question: 'What is middleware in Express.js?', options: ['A database layer', 'Functions with access to req, res, and next', 'A template engine', 'A routing mechanism'], correctOptionIndex: 1, points: 1 },
      { question: 'Which module handles file paths across OS?', options: ['fs', 'path', 'os', 'url'], correctOptionIndex: 1, points: 1 },
      { question: 'What is process.env for?', options: ['Managing environment variables', 'Processing data in parallel', 'Monitoring CPU usage', 'Handling file encoding'], correctOptionIndex: 0, points: 1 },
      { question: 'What does CORS control?', options: ['Database connections', 'Which domains can access your API', 'API formats', 'Request encryption'], correctOptionIndex: 1, points: 2 },
      { question: 'Authentication vs Authorization?', options: ['Same thing', 'Auth verifies identity; authz determines access', 'Auth for APIs; authz for pages', 'Auth uses passwords; authz uses tokens'], correctOptionIndex: 1, points: 2 },
    ],
  },
  {
    title: 'Database Fundamentals',
    skill: 'databases',
    description: 'Assess your knowledge of database concepts including SQL, NoSQL, indexing, and data modeling.',
    difficulty: 'intermediate',
    durationMinutes: 15,
    passingScore: 70,
    isActive: true,
    questions: [
      { question: 'What is a database index?', options: ['A primary key', 'A data structure that improves query speed', 'A database backup', 'A type of table join'], correctOptionIndex: 1, points: 1 },
      { question: 'What does ACID stand for?', options: ['Automated, Consistent, Isolated, Durable', 'Atomicity, Consistency, Isolation, Durability', 'Async, Concurrent, Independent, Distributed', 'Accessible, Controlled, Indexed, Distributed'], correctOptionIndex: 1, points: 2 },
      { question: 'When to choose MongoDB over PostgreSQL?', options: ['When you need strict ACID', 'When schema changes frequently and data is document-oriented', 'When you need complex joins', 'When you need stored procedures'], correctOptionIndex: 1, points: 2 },
      { question: 'What is database normalization?', options: ['Making all values lowercase', 'Organizing data to reduce redundancy', 'Encrypting data', 'Compressing the database'], correctOptionIndex: 1, points: 1 },
      { question: 'Which MongoDB operator updates a specific field?', options: ['$push', '$set', '$update', '$modify'], correctOptionIndex: 1, points: 1 },
      { question: 'What is a compound index?', options: ['A chemistry term', 'An index on multiple fields', 'Two indexes combined', 'An index using B-tree and hash'], correctOptionIndex: 1, points: 2 },
    ],
  },
  {
    title: 'Python Basics',
    skill: 'python',
    description: 'Test your Python programming fundamentals including data structures, OOP, and Pythonic patterns.',
    difficulty: 'beginner',
    durationMinutes: 15,
    passingScore: 70,
    isActive: true,
    questions: [
      { question: 'What is a list comprehension in Python?', options: ['Understanding lists better', 'A concise way to create lists using a single expression', 'A method to sort lists', 'A data validation technique'], correctOptionIndex: 1, points: 1 },
      { question: 'Difference between tuple and list?', options: ['Tuples faster, lists less memory', 'Tuples are immutable, lists are mutable', 'Lists can only hold strings', 'No difference'], correctOptionIndex: 1, points: 1 },
      { question: 'What does "self" refer to in a class method?', options: ['The class itself', 'The current instance of the class', 'The parent class', 'A global variable'], correctOptionIndex: 1, points: 1 },
      { question: 'What is a decorator in Python?', options: ['A GUI design pattern', 'A function that modifies another function', 'A way to add comments', 'A styling system'], correctOptionIndex: 1, points: 2 },
      { question: 'What does `if __name__ == "__main__":` do?', options: ['Checks for main function', 'Runs code only when file executed directly', 'Defines entry point', 'Checks Python version'], correctOptionIndex: 1, points: 2 },
      { question: 'Output of: print(type([]) is list)?', options: ['True', 'False', 'TypeError', 'None'], correctOptionIndex: 0, points: 1 },
    ],
  },
  {
    title: 'Problem Solving & Logic',
    skill: 'problem-solving',
    description: 'Evaluate your analytical thinking, algorithmic knowledge, and problem-solving approaches.',
    difficulty: 'intermediate',
    durationMinutes: 20,
    passingScore: 60,
    isActive: true,
    questions: [
      { question: 'Time complexity of binary search?', options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'], correctOptionIndex: 1, points: 1 },
      { question: 'Which data structure uses LIFO?', options: ['Queue', 'Stack', 'Linked List', 'Hash Map'], correctOptionIndex: 1, points: 1 },
      { question: 'Best approach for an unfamiliar problem?', options: ['Write code immediately', 'Break into parts, identify patterns, then code', 'Search for exact solution', 'Skip and move on'], correctOptionIndex: 1, points: 2 },
      { question: 'What is memoization?', options: ['Writing documentation', 'Caching results to avoid recomputation', 'Memory management technique', 'Memorizing syntax'], correctOptionIndex: 1, points: 2 },
      { question: 'Best average-case sorting algorithm?', options: ['Bubble Sort O(n²)', 'Merge Sort O(n log n)', 'Selection Sort O(n²)', 'Insertion Sort O(n²)'], correctOptionIndex: 1, points: 1 },
      { question: 'What is a hash collision?', options: ['Two keys map to same index; chaining or open addressing', 'Hash function crashes; restart', 'Two identical values; deduplicate', 'Memory runs out; garbage collect'], correctOptionIndex: 0, points: 2 },
      { question: 'Space complexity of recursive function with n levels?', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], correctOptionIndex: 2, points: 2 },
    ],
  },
];

async function seed() {
  await connectDB();
  console.log('✅ Connected to MongoDB');

  const existingCount = await SkillTest.countDocuments();
  if (existingCount > 0) {
    console.log(`⚠️  Found ${existingCount} existing tests. Removing...`);
    await SkillTest.deleteMany({});
  }

  const created = await SkillTest.insertMany(tests);
  console.log(`✅ Created ${created.length} skill tests:`);
  created.forEach((t: any) => {
    console.log(`   📝 ${t.title} (${t.skill}) — ${t.questions.length} Qs, ${t.durationMinutes} min`);
  });

  console.log('\n✅ Seed completed.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});

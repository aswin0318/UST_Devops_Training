import re

word_count = {}

'''
with open("sample.log", "w") as f:
  f.write("The word portal appears once as a separate word in the string.\n")
  f.write("the the the\n")
''' 

with open("sample.log", "r") as f:
  for line in f:
    words = re.findall(r"\b\w+\b", str(line))
    for word in words:
      if word.lower() in word_count:
        word_count[word.lower()] += 1
      else:
        word_count[word.lower()] = 1
total_words = sum(list(word_count.values()))
one_percent = total_words * 0.01
needle_set = set()
for word in word_count:
  if (word_count[word] / total_words) < one_percent:
    needle_set.add(word)

with open("sample.log", 'r') as f:
  for line in f:
    words = re.findall(r"\b\w+\b", str(line))
    line_set = set(words)
    line_set = {word.lower() for word in line_set if isinstance(word, str)}
    if line_set.intersection(needle_set):
      print(line)
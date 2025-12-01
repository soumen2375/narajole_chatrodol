import { Component, inject, signal, OnInit, effect } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ContentService, Post } from '../../../services/content.service';

@Component({
  selector: 'app-post-form',
  templateUrl: './post-form.component.html',
  styleUrls: [],
  imports: [CommonModule, ReactiveFormsModule],
})
export class PostFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private contentService = inject(ContentService);
  router = inject(Router);
  private route = inject(ActivatedRoute);

  postForm!: FormGroup;
  isEditMode = signal(false);
  postId: string | null = null;
  categories = this.contentService.categories; // Get categories from service

  constructor() {
    effect(() => {
      // Initialize form only when categories are loaded
      if (this.categories().length > 0) {
        this.initializeForm();
      }
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.postId = params.get('id');
      if (this.postId) {
        this.isEditMode.set(true);
        const post = this.contentService.getPostById(this.postId);
        if (post) {
          this.postForm.patchValue(post);
        } else {
          console.warn('Post not found for ID:', this.postId);
          this.router.navigate(['/admin/posts']);
        }
      }
    });
    // If categories are already loaded, initialize form immediately
    if (this.categories().length > 0) {
      this.initializeForm();
    }
  }

  private initializeForm(): void {
    this.postForm = this.fb.group({
      title: ['', Validators.required],
      content: ['', Validators.required],
      category: [this.categories()[0] || '', Validators.required], // Default to first category
      tags: [''],
      featuredImage: ['https://picsum.photos/800/600'],
      author: ['Admin'],
      publishedDate: [new Date().toISOString().substring(0, 10)], // YYYY-MM-DD
      seoTitle: [''],
      metaDescription: [''],
      slug: ['']
    });
  }

  onSubmit(): void {
    if (this.postForm.invalid) {
      this.postForm.markAllAsTouched();
      return;
    }

    const formData = { ...this.postForm.value };
    // Process tags string into an array
    formData.tags = formData.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0);

    if (this.isEditMode() && this.postId) {
      this.contentService.updatePost(this.postId, formData);
      alert('Post updated successfully!');
    } else {
      this.contentService.addPost(formData);
      alert('Post created successfully!');
    }
    this.router.navigate(['/admin/posts']);
  }
}
